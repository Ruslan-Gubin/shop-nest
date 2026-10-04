import { createHmac } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { Agent } from "undici";

const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

type PsbParams = Record<string, string>;

/** Ответ get_terminal_parms */
interface PsbTerminalParamsResponse {
  SBP_ID?: string;
  SBP_ACCOUNT_NUMBER?: string;
  SBP_MERCHANT?: string;
  P_SIGN?: string;
  ERROR?: string;
}

/** Ответ reg_qr */
interface PsbRegQrResponse {
  QR_ID?: string;
  QR_DATA?: string;
  QR_IMG_REF?: string;
  QR_PSB_ID?: string;
  QR_IMG_DATA?: string;
  P_SIGN?: string;
  ERROR?: string;
}

/** Ответ get_qr_status */
interface PsbQrStatusResponse {
  RND_NUMBER?: string;
  P_SIGN?: string;
  NSPK_JSON_RESP_DATA?: {
    code: string;
    message: string;
    data: Array<{
      qrcId: string;
      code: string;
      message: string;
      status: string; // NTST | ACWP | RJCT | RCVD
      trxId: string | null;
    }>;
  };
  ERROR?: string;
}

/** Ответ refund */
interface PsbRefundResponse {
  SBP_TRAN_ID?: string;
  SBP_REFUND_TRAN_ID?: string;
  REFUND_PROC_RESULT?: string; // SUCCESS | NOT COMPLETED | FATAL ERROR | ERROR
  REFUND_PROC_MESS?: string;
  RND_NUMBER?: string;
  P_SIGN?: string;
  ERROR?: string;
}

// ─── Результаты для бизнес-логики ───────────────────────────────────

export interface PsbCreatePaymentResult {
  qr_id: string; // ID в системе НСПК — для проверки статуса
  qr_data: string; // платёжная ссылка https://qr.nspk.ru/...
  // qr_img_data: string; // base64 картинка QR
  qr_psb_id: string; // ID в системе банка
}

export interface PsbPaymentStatusResult {
  status: "pending" | "paid" | "rejected" | "processing";
  sbp_tran_id: string | null; // ID операции в НСПК — для возврата
}

// ─── Порядок полей для P_SIGN (из документации ПСБ) ─────────────────

/**
 * Поля подписи для запросов на шлюз (get_terminal_parms, reg_qr).
 * Те же, что при отправке запроса на шлюз для оплаты.
 */
const SIGN_FIELDS_GATEWAY = ["AMOUNT", "CURRENCY", "TERMINAL", "TRTYPE", "BACKREF", "ORDER"];

/**
 * Поля подписи для get_qr_status.
 * Порядок: RND_NUMBER, TERMINAL
 */
const SIGN_FIELDS_QR_STATUS = ["RND_NUMBER", "TERMINAL"];

/**
 * Поля подписи для refund.
 * Порядок: SBP_TRAN_ID, RND_NUMBER
 */
const SIGN_FIELDS_REFUND = ["SBP_TRAN_ID", "RND_NUMBER"];

/**
 * Поля подписи для проверки ответа банка.
 * get_terminal_parms: SBP_ID, SBP_ACCOUNT_NUMBER, SBP_MERCHANT
 * reg_qr:             QR_ID, QR_DATA
 * get_qr_status:      RND_NUMBER, TERMINAL
 */
const VERIFY_FIELDS_TERMINAL_PARAMS = ["SBP_ID", "SBP_ACCOUNT_NUMBER", "SBP_MERCHANT"];
const VERIFY_FIELDS_REG_QR = ["QR_ID", "QR_DATA"];
const VERIFY_FIELDS_QR_STATUS = ["RND_NUMBER", "TERMINAL"];

// ─── Маппинг статусов НСПК ──────────────────────────────────────────

const NSPK_STATUS_MAP: Record<string, PsbPaymentStatusResult["status"]> = {
  NTST: "pending",
  ACWP: "paid",
  RJCT: "rejected",
  RCVD: "processing",
};

// ─── Сервис ─────────────────────────────────────────────────────────

@Injectable()
export class PsbSbpService {
  private readonly logger = new Logger(PsbSbpService.name);

  private readonly BASE_URL = "https://test.3ds.payment.ru"; //https://3ds.payment.ru
  private readonly TERMINAL = "79036768";
  private readonly MERCHANT = "790367686219999";
  private readonly MERCH_NAME = "TEST_MERCH";
  private readonly KEY_COMP1 = "C50E41160302E0F5D6D59F1AA3925C45";
  private readonly KEY_COMP2 = "00000000000000000000000000000000";
  private readonly BACKREF_URL = "http://localhost:4010";
  private readonly NOTIFY_URL = "http://localhost:4010/payments/psb/callback";

  // Идентификаторы НСПК — получаются один раз через get_terminal_parms
  private sbpId = "";
  private sbpAccountNumber = "";
  private sbpMerchant = "";

  // ─── 1. Получение параметров НСПК (один раз) ──────────────────────

  /**
   * Получает SBP_ID, SBP_ACCOUNT_NUMBER, SBP_MERCHANT от банка.
   */
  async ensureSbpParams(): Promise<void> {
    if (this.sbpId && this.sbpAccountNumber && this.sbpMerchant) return;

    const params: PsbParams = {
      AMOUNT: "500.00",
      CURRENCY: "RUB",
      TERMINAL: this.TERMINAL,
      TRTYPE: "1",
      BACKREF: this.BACKREF_URL,
      ORDER: "124443534",
      MERCH_NAME: this.MERCH_NAME,
      MERCHANT: this.MERCHANT,
    };

    const res = await this.postPSB<PsbTerminalParamsResponse>(
      "/cgi-bin/SBP/get_terminal_parms",
      params,
      SIGN_FIELDS_GATEWAY,
    );

    if (res.ERROR) throw `ПСБ get_terminal_parms: ${res.ERROR}`;
    if (!res.SBP_ID || !res.SBP_ACCOUNT_NUMBER || !res.SBP_MERCHANT)
      throw "ПСБ не вернул идентификаторы НСПК";

    // Проверка подписи банка
    this.verifyBankSign(res, VERIFY_FIELDS_TERMINAL_PARAMS, res.P_SIGN);

    this.sbpId = res.SBP_ID;
    this.sbpAccountNumber = res.SBP_ACCOUNT_NUMBER;
    this.sbpMerchant = res.SBP_MERCHANT;

    this.logger.log("Параметры НСПК получены");
  }

  // ─── 2. Создание платежа (reg_qr) ────────────────────────────────

  /**
   * Создаёт динамический QR-код для оплаты через СБП.
   *
   * @param amount       — сумма в копейках (350000 = 3500.00 ₽)
   * @param orderNumber  — номер заказа (уникальный)
   * @param description  — описание платежа
   * @param email        — email клиента (для уведомления от банка)
   * @returns            — QR_ID, QR_DATA (ссылка), QR_IMG_DATA (base64), QR_PSB_ID
   */
  async createPayment(
    amount: number,
    orderNumber: string,
    description: string,
    email?: string,
  ): Promise<PsbCreatePaymentResult> {
    await this.ensureSbpParams();

    const params: PsbParams = {
      AMOUNT: (amount / 100).toFixed(2),
      CURRENCY: "RUB",
      ORDER: orderNumber,
      EMAIL: email || "",
      DESC: description || `Оплата заказа ${orderNumber}`,
      TERMINAL: this.TERMINAL,
      TRTYPE: "1",
      MERCH_NAME: this.MERCH_NAME,
      MERCHANT: this.MERCHANT,
      BACKREF: this.BACKREF_URL,
      NOTIFY_URL: this.NOTIFY_URL,
      SBP_ID: this.sbpId,
      SBP_ACCOUNT_NUMBER: this.sbpAccountNumber,
      SBP_MERCHANT: this.sbpMerchant,
      REGIME: "desktop", // desktop — вернёт QR_IMG_DATA (картинку)
      QR_TTL: "4320", // срок жизни QR в минутах (3 суток)
      SBP_QR_IMG_TYPE: "image/png",
    };

    const res = await this.postPSB<PsbRegQrResponse>(
      "/cgi-bin/SBP/reg_qr",
      params,
      SIGN_FIELDS_GATEWAY,
    );

    if (res.ERROR) throw `ПСБ reg_qr: ${res.ERROR}`;
    if (!res.QR_ID || !res.QR_DATA || !res.QR_IMG_DATA)
      throw `ПСБ reg_qr: неполный ответ — ${JSON.stringify(res)}`;

    // Проверка подписи банка (порядок: QR_ID, QR_DATA)
    this.verifyBankSign(res, VERIFY_FIELDS_REG_QR, res.P_SIGN);

    return {
      qr_id: res.QR_ID,
      qr_data: res.QR_DATA,
      // qr_img_data: res.QR_IMG_DATA,
      qr_psb_id: res.QR_PSB_ID || "",
    };
  }

  // ─── 3. Проверка статуса (get_qr_status) ──────────────────────────

  /**
   * Проверяет статус QR-кода в НСПК.
   * Фолбэк, если callback от банка не пришёл в течение 5 минут.
   *
   * @param qrId — идентификатор QR в системе НСПК (из createPayment)
   * @returns    — status: pending|paid|rejected|processing + sbp_tran_id
   */
  async getStatus(qrId: string): Promise<PsbPaymentStatusResult> {
    const rnd = String(Math.floor(Math.random() * 9999999999));

    const params: PsbParams = {
      NSPK_JSON_DATA: JSON.stringify({ qrcIds: [qrId] }),
      RND_NUMBER: rnd,
      TERMINAL: this.TERMINAL,
    };

    const res = await this.postPSB<PsbQrStatusResponse>(
      "/cgi-bin/SBP/get_qr_status",
      params,
      SIGN_FIELDS_QR_STATUS,
    );

    if (res.ERROR) throw `ПСБ get_qr_status: ${res.ERROR}`;
    if (!res.NSPK_JSON_RESP_DATA?.data?.length)
      throw `ПСБ get_qr_status: нет данных для QR ${qrId}`;

    // Проверка подписи банка (порядок: RND_NUMBER, TERMINAL)
    this.verifyBankSign(res, VERIFY_FIELDS_QR_STATUS, res.P_SIGN);

    const item = res.NSPK_JSON_RESP_DATA.data[0];

    return {
      status: NSPK_STATUS_MAP[item.status] ?? "pending",
      sbp_tran_id: item.trxId,
    };
  }

  // ─── 4. Обработка callback от банка ──────────────────────────────

  /**
   * Обрабатывает POST-уведомление от банка об оплате QR-кода.
   * Банк шлёт: ORDER, AMOUNT, TERMINAL, QR_ID, SBP_TRAN_ID, P_SIGN, ...
   *
   * @param body — тело POST-запроса от банка
   * @returns    — данные для обновления статуса заказа
   */
  handleCallback(body: Record<string, string>): {
    orderNumber: string;
    amount: number;
    qrId: string;
    sbpTranId: string;
  } {
    // 1. Проверка подписи банка
    //    В callback банк присылает P_SIGN, подпись строится по тем же полям,
    //    что и при оплате картой: AMOUNT, CURRENCY, TERMINAL, TRTYPE, BACKREF, ORDER
    const expectedSign = this.signPsb(body, SIGN_FIELDS_GATEWAY);

    if (body.P_SIGN !== expectedSign) {
      this.logger.error("Неверная подпись callback от ПСБ");
      throw "Неверная подпись callback";
    }

    // 2. Проверка обязательных полей
    if (!body.ORDER || !body.AMOUNT || !body.QR_ID || !body.SBP_TRAN_ID)
      throw "Неполный callback от ПСБ";

    return {
      orderNumber: body.ORDER,
      amount: Math.round(parseFloat(body.AMOUNT) * 100), // обратно в копейки
      qrId: body.QR_ID,
      sbpTranId: body.SBP_TRAN_ID,
    };
  }

  // ─── 5. Возврат (на потом) ────────────────────────────────────────

  /**
   * Возвращает средства клиенту. Банк сам знает, куда вернуть деньги.
   *
   * @param sbpTranId — ID операции в НСПК (из callback или getStatus)
   * @param amount    — сумма возврата в копейках
   */
  async refund(sbpTranId: string, amount: number) {
    const rnd = String(Math.floor(Math.random() * 9999999999));

    const params: PsbParams = {
      SBP_TRAN_ID: sbpTranId,
      AMOUNT: (amount / 100).toFixed(2),
      TERMINAL: this.TERMINAL,
      RECEIVER_PHONE: "",
      RECEIVER_BANK_ID: "",
      RND_NUMBER: rnd,
    };

    const res = await this.postPSB<PsbRefundResponse>(
      "/cgi-bin/SBP/refund",
      params,
      SIGN_FIELDS_REFUND,
    );

    if (res.ERROR) throw `ПСБ refund: ${res.ERROR}`;

    // SUCCESS — возврат прошёл, NOT COMPLETED — нужно проверить статус позже,
    // FATAL ERROR — не повторять, писать в поддержку, ERROR — можно повторить
    if (res.REFUND_PROC_RESULT === "FATAL ERROR")
      throw `ПСБ refund: критическая ошибка — ${res.REFUND_PROC_MESS}`;
    if (res.REFUND_PROC_RESULT === "ERROR") throw `ПСБ refund: ошибка — ${res.REFUND_PROC_MESS}`;

    const result =
      res && res?.REFUND_PROC_RESULT && res.REFUND_PROC_RESULT === "SUCCESS"
        ? "SUCCESS"
        : "NOT COMPLETED";
    const message = res?.REFUND_PROC_MESS || "";

    return { result, message };
  }

  // ─── Вспомогательные методы ───────────────────────────────────────

  /**
   * Генерация P_SIGN — HMAC-SHA256.
   * Алгоритм: XOR двух ключевых компонент → MAC (длина+значение) → hex.
   * Пустые значения заменяются на "-".
   */
  private signPsb(params: PsbParams, fields: string[]): string {
    const keyComp1 = Buffer.from(this.KEY_COMP1, "hex");
    const keyComp2 = Buffer.from(this.KEY_COMP2, "hex");
    const key = keyComp1.map((byte, i) => byte ^ keyComp2[i]);

    const mac = fields
      .map((field) => {
        const value = params[field] ?? "";
        return value.length > 0 ? `${value.length}${value}` : "-";
      })
      .join("");

    return createHmac("sha256", key).update(mac).digest("hex").toUpperCase();
  }

  /**
   * Проверка подписи банка в ответе.
   * Банк возвращает P_SIGN, построенный по указанным полям.
   */
  private verifyBankSign(response: Record<string, any>, fields: string[], bankSign?: string): void {
    if (!bankSign) {
      this.logger.warn("Ответ ПСБ не содержит P_SIGN — пропускаю проверку");
      return;
    }

    const expected = this.signPsb(response as PsbParams, fields);
    if (expected !== bankSign) {
      this.logger.warn("Подпись банка не совпадает — возможна подмена");
    }
  }

  private async postPSB<T>(path: string, params: PsbParams, sign_fields: string[]): Promise<T> {
    const url = `${this.BASE_URL}${path}`;

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...params,
        P_SIGN: this.signPsb(params, sign_fields),
      }).toString(),
    })
      .then((response) => {
        if (!response.ok) {
          throw `HTTP ${response.status}`;
        }
        return response.json();
      })
      .then((response) => {
        return response;
      })
      .catch((error) => {
        throw `Ошибка запроса к ПСБ (${path}): ${error}`;
      });
  }
}
