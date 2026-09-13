import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { Payment } from "./entities/payment.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async createPayment(orderId: number, amount: number): Promise<Payment> {
    return this.paymentsRepository
      .save({
        order_id: orderId,
        amount,
        status: "pending",
      })
      .catch((error) => {
        throw `Не удалось создать платёж для заказа ${orderId}, ${error.message}`;
      });
  }

  async findByOrder(orderId: number): Promise<Payment[]> {
    return this.paymentsRepository
      .find({ where: { order_id: orderId }, order: { id: "DESC" } })
      .catch((error) => {
        throw `Не удалось получить платежи заказа ${orderId}, ${error.message}`;
      });
  }
}