import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import { Order } from "./entities/order.entity";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.ordersRepository.save(createOrderDto).catch((error) => {
      throw `Не удалось создать заказ, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.ordersRepository
      .find({
        skip,
        take: Number(limit),
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список заказов, ${error.message}`;
      });
  }

  async getTotalCount() {
    return this.ordersRepository.count().catch((error) => {
      throw `Не удалось получить общее количество заказов, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.ordersRepository.findOneBy({ id }).catch((error) => {
      throw `Не удалось получить заказ, ${error.message}`;
    });
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    return this.ordersRepository.update(id, updateOrderDto).catch((error) => {
      throw `Не удалось изменить заказ, ${error.message}`;
    });
  }

  async delete(id: number) {
    return this.ordersRepository.delete(id).catch((error) => {
      throw `Не удалось удалить заказ, ${error.message}`;
    });
  }
}

