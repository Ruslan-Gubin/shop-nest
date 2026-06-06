import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { CreateOrderProductDto } from "./dto/create-order-product.dto";
import { UpdateOrderProductDto } from "./dto/update-order-product.dto";
import { OrderProduct } from "./entities/order-product.entity";

@Injectable()
export class OrderProductService {
  constructor(
    @InjectRepository(OrderProduct)
    private orderProductRepository: Repository<OrderProduct>,
  ) {}

  async create(createOrderProductDto: CreateOrderProductDto) {
    return this.orderProductRepository.save(createOrderProductDto).catch((error) => {
      throw `Не удалось добавить товар в заказ, ${error.message}`;
    });
  }

  async findAll(order_id: string) {
    return this.orderProductRepository
      .find({
        order: { id: "DESC" },
        where: { order_id: Number(order_id) },
      })
      .catch((error) => {
        throw `Не удалось получить список товаров заказа, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.orderProductRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить товар заказа, ${error.message}`;
      });
  }

  async update(id: number, updateOrderProductDto: UpdateOrderProductDto) {
    return this.orderProductRepository
      .update(id, {
        ...updateOrderProductDto,
      })
      .catch((error) => {
        throw `Не удалось изменить товар заказа, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.orderProductRepository.delete(id).catch((error) => {
      throw `Не удалось удалить товар заказа, ${error.message}`;
    });
  }
}