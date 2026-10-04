import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { PsbPaymentStatusResult, PsbSbpService } from "src/psb/psb.service";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly psbService: PsbSbpService,
  ) {}

  async createPaymentFromOrder(
    order_id: number,
    amount: number,
    order_number: string,
  ): Promise<Payment> {
    const createPaymentBank = await this.psbService.createPayment(
      amount,
      order_number,
      `Оплата заказа ${order_number} на сумму: ${order_number}`,
      "gubin_ruslan@rambler.ru",
    );

    return this.paymentsRepository
      .save({
        order: { id: order_id },
        amount,
        provider: "psb",
        status: "pending",
        qr_id: createPaymentBank.qr_id,
        qr_data: createPaymentBank.qr_data,
        qr_psb_id: createPaymentBank.qr_psb_id,
      })
      .catch((error) => {
        throw `Не удалось создать платёж для заказа ${order_id}, ${error.message}`;
      });
  }

  async refund(order_id: number, amount: number) {
    const findPayment = await this.findByOrder(order_id);

    if (!findPayment) {
      throw `Не удалось получить платежи заказа ${order_id}`;
    }

    if (findPayment && !findPayment.sbp_tran_id) {
      throw "Не удалось получить sbp tran id для возврата";
    }

    if (amount > findPayment.amount) {
      throw "Сумма возврата не должна превышать суммы заказа";
    }

    const refund = await this.psbService.refund(findPayment.sbp_tran_id, amount);

    await this.paymentsRepository
      .update(findPayment.id, {
        status: refund.result === "SUCCESS" ? "refunded" : "failed",
        error_message:
          refund.message !== "SUCCESS" &&
          refund.message.length > 0 &&
          refund.message !== findPayment.error_message
            ? refund.message
            : findPayment.error_message,
      })
      .catch((error) => {
        throw `Не удалось обновить платеж заказа, ${error}`;
      });

    return refund;
  }

  async findByOrder(order_id: number): Promise<Payment> {
    const payment = await this.paymentsRepository
      .findOne({ where: { order: { id: order_id } } })
      .catch((error) => {
        throw `Не удалось получить платежи заказа ${order_id}, ${error.message}`;
      });

    if (!payment) {
      throw "Не удалось получить платеж заказа";
    }

    if (payment.status !== "paid") {
      const updateStatus = await this.checkBankPayment(
        payment.qr_id,
        payment.id,
        payment.status,
        payment.error_message,
      );
      console.log(updateStatus);
      // payment.status = updateStatus?.status;
      // payment.error_message = updateStatus?.error_message;
      // payment.paid_at = updateStatus?.paid_at;
      // payment.sbp_tran_id = updateStatus.sbp_tran_id;
    }

    return payment;
  }

  async checkBankPayment(
    qr_id: string,
    id: number,
    prevStatus: PaymentStatus,
    prevErrorMessage: string,
  ): Promise<PsbPaymentStatusResult> {
    const status = await this.psbService.getStatus(qr_id);

    // if (status.status !== prevStatus || status.error_message !== prevErrorMessage) {
    //   await this.paymentsRepository
    //     .update(id, {
    //       status: status.status,
    //       paid_at: status.status === "paid" && status.paid_at ? status.paid_at : null,
    //       error_message: status.error_message ? status.error_message : "",
    //     })
    //     .catch((error) => {
    //       throw `Не удалось обновить платеж для заказа, ${error}`;
    //     });
    // }

    return status;
  }
}
