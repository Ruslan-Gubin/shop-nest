import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { CreateOrderProductDto } from './dto/create-order-product.dto';
import { UpdateOrderProductDto } from './dto/update-order-product.dto';
import type { SetShortageItemDto } from './dto/set-shortage.dto';
import { OrderProduct } from './entities/order-product.entity';

@Injectable()
export class OrderProductService {
  constructor(
    @InjectRepository(OrderProduct)
    private orderProductRepository: Repository<OrderProduct>,
  ) {}

  async create(createOrderProductDto: CreateOrderProductDto) {
    return this.orderProductRepository
      .save({
        ...createOrderProductDto,
        reservations: createOrderProductDto.reservations ?? [],
      })
      .catch((error) => {
        throw `Не удалось добавить товар в заказ, ${error.message}`;
      });
  }

  async getAll() {
    return this.orderProductRepository.find().catch((error) => {
      throw `Не удалось получить список товаров заказа, ${error.message}`;
    });
  }

  async findAll(order_id: number) {
    return this.orderProductRepository
      .find({
        order: { id: 'DESC' },
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
      .update(id, updateOrderProductDto)
      .catch((error) => {
        throw `Не удалось изменить товар заказа, ${error.message}`;
      });
  }

  async setShortageStocks(shortage_stocks: SetShortageItemDto[]) {
    const productsUpdate: Map<number, OrderProduct> = new Map();

    for (const item of shortage_stocks) {
      let orderProduct: OrderProduct | null | undefined = null;

      if (productsUpdate.has(item.id)) {
        orderProduct = productsUpdate.get(item.id);
      } else {
        const product = await this.findOne(item.id);

        if (product) {
          productsUpdate.set(product.id, product);
          orderProduct = productsUpdate.get(product.id);
        }
      }

      if (!orderProduct) {
        throw `Товар заказа с ID ${item.id} не найден.`;
      }

      if (item.quantity > orderProduct.quantity) {
        throw `Количество ${item.quantity} для товара заказа ${item.id} не может превышать заказанное ${orderProduct.quantity}`;
      }

      const reservation = orderProduct.reservations.find(
        (el) =>
          el.stock_id === item.stock_id &&
          el.warehouse_id === item.warehouse_id,
      );

      if (!reservation) {
        throw `Остаток ${item.stock_id} на складе ${item.warehouse_id} не участвует в резервациях товара заказа ${item.id}`;
      }

      const prevShortageItem = orderProduct.shortage_stocks.find(
        (el) =>
          el.stock_id === item.stock_id &&
          el.warehouse_id === item.warehouse_id,
      );

      if (prevShortageItem && item.quantity === reservation.quantity) {
        orderProduct.shortage_stocks = orderProduct.shortage_stocks.filter(
          (el) =>
            el.stock_id !== item.stock_id &&
            el.warehouse_id !== item.warehouse_id,
        );
      } else if (!prevShortageItem) {
        orderProduct.shortage_stocks.push({
          stock_id: item.stock_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
        });
      } else {
        prevShortageItem.quantity = item.quantity;
      }
    }

    for (const product of productsUpdate.values()) {
      await this.update(product.id, {
        shortage_stocks: product.shortage_stocks,
      });
    }
  }

  async remove(id: number) {
    await this.orderProductRepository.delete(id).catch((error) => {
      throw `Не удалось удалить товар заказа, ${error.message}`;
    });
  }

  async hasShortage(order_id: number): Promise<boolean> {
    return this.findAll(order_id)
      .then((response) =>
        response.some(
          (el) =>
            Array.isArray(el.shortage_stocks) && el.shortage_stocks.length > 0,
        ),
      )
      .catch(() => false);
  }
}
