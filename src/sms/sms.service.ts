import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon from "argon2";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { CreateSmsOutboxDto } from "./dto/create-sms-outbox.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SmsOutbox, SmsOutboxStatus } from "./entities/sms-outbox.entity";

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SmsOutbox)
    private readonly smsRepository: Repository<SmsOutbox>,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ phone: string; device_id: string }> {
    const phone = dto.phone;

    let outbox: SmsOutbox | null = null;

    if (dto.device_id) {
      outbox = await this.smsRepository.findOne({ where: { device_id: dto.device_id } });
    }

    if (outbox) {
      const last = new Date(outbox.updated_at || outbox.created_at).getTime();
      const expiresAt = last + 60 * 1000;
      const dateNow = Date.now();

      if (dateNow < expiresAt) {
        const leftSecond = Math.ceil((expiresAt - dateNow) / 1000);
        throw `Повторная отправка возможна через ${leftSecond} сек`;
      }
    }

    const device_id = dto.device_id ?? randomUUID();
    const code = this.generateCode();
    const codeHash = await argon.hash(code).catch((error) => {
      throw `Не удалось создать хэш кода, ${error}`;
    });
    const messageText = `Код подтверждения: ${code}. Действует 5 минут`;

    if (outbox) {
      await this.update(outbox.id, {
        phone,
        code_hash: codeHash,
        message_text: messageText,
      });
    } else {
      outbox = await this.create({
        phone,
        code_hash: codeHash,
        message_text: messageText,
        device_id,
      });
    }

    return { phone, device_id };
  }

  async create(dto: CreateSmsOutboxDto): Promise<SmsOutbox> {
    return this.smsRepository
      .save({
        phone: dto.phone,
        code_hash: dto.code_hash,
        message_text: dto.message_text,
        status: "pending",
        device_id: dto.device_id || "",
      })
      .catch((error) => {
        throw `Не удалось создать запись на отправку SMS, ${error}`;
      });
  }

  async update(id: number, dto: CreateSmsOutboxDto) {
    return this.smsRepository
      .update(id, {
        phone: dto.phone,
        code_hash: dto.code_hash,
        message_text: dto.message_text,
        status: "pending",
        sender_phone: "",
        verify_attempts: 0,
        delivery_attempts: 0,
      })
      .catch((error) => {
        throw `Не удалось изменить запись на отправку SMS, ${error}`;
      });
  }

  async delete(id: number) {
    return this.smsRepository.delete(id).catch((error) => {
      throw `Не удалось удалить запись, ${error}`;
    });
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<void> {
    const record = await this.smsRepository
      .findOne({
        where: { phone: dto.phone, status: "pending" },
        order: { updated_at: "DESC" as unknown as "ASC" },
      })
      .catch((error) => {
        throw `Не удалось найти запись кода подтверждения, ${error}`;
      });

    if (!record) {
      throw "Код не найден. Запросите новый код";
    }

    if (record.verify_attempts >= 5) {
      throw "Превышено число попыток. Запросите новый код";
    }

    const OTP_TTL_MS = 5 * 60 * 1000;

    const updatedAt = new Date(record.updated_at || record.created_at).getTime();

    if (Date.now() > updatedAt + OTP_TTL_MS) {
      await this.delete(record.id);
      throw "Срок действия кода истёк. Запросите новый код";
    }

    const isValid = await argon.verify(record.code_hash, dto.code).catch(() => false);

    if (!isValid) {
      await this.smsRepository
        .update(record.id, { verify_attempts: record.verify_attempts + 1 })
        .catch((error) => {
          throw `Не удалось обновить попытки ввода кода, ${error}`;
        });

      const left = 5 - record.verify_attempts;

      throw `Неверный код. Осталось попыток: ${left}`;
    } else {
      await this.delete(record.id);
    }
  }

  /**
   * Возвращает записи, ожидающие отправки устройством (только не протухшие).
   * Если передан номер телефона устройства — привязывает его к забранным записям.
   */
  //TODO
  async getPending(senderPhone?: string): Promise<SmsOutbox[]> {
    const now = new Date();

    const records = await this.smsRepository
      .find({
        where: { status: "pending" },
        order: { created_at: "ASC" },
        take: 100,
      })
      .catch((error) => {
        throw `Не удалось получить записи на отправку SMS, ${error}`;
      });

    const notExpired = records.filter((record) => record.created_at > now);

    const sender = senderPhone?.trim();
    if (sender && notExpired.length > 0) {
      await this.smsRepository
        .update({ id: In(notExpired.map((record) => record.id)) }, { sender_phone: sender })
        .catch((error) => {
          throw `Не удалось привязать отправителя к записям, ${error}`;
        });

      notExpired.forEach((record) => {
        record.sender_phone = sender;
      });
    }

    return notExpired;
  }

  /** Устройство отправило SMS — запись удаляется. */
  //TODO
  async markDelivered(id: number): Promise<boolean> {
    const result = await this.smsRepository.delete(id).catch((error) => {
      throw `Не удалось удалить запись на отправку SMS, ${error}`;
    });

    if (!result.affected) {
      throw "Запись на отправку SMS не найдена";
    }

    return true;
  }

  /** Устройство не смогло отправить SMS — наращиваем счётчик попыток. */
  //TODO
  async markFailed(id: number): Promise<SmsOutbox> {
    const record = await this.smsRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить запись на отправку SMS, ${error}`;
    });

    if (!record) {
      throw "Запись на отправку SMS не найдена";
    }

    const deliveryAttempts = record.delivery_attempts + 1;

    const MAX_DELIVERY_ATTEMPTS = 3;

    const status: SmsOutboxStatus =
      deliveryAttempts >= MAX_DELIVERY_ATTEMPTS ? "failed" : "pending";

    await this.smsRepository
      .update(id, { delivery_attempts: deliveryAttempts, status })
      .catch((error) => {
        throw `Не удалось обновить запись на отправку SMS, ${error}}`;
      });

    return { ...record, delivery_attempts: deliveryAttempts, status };
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
