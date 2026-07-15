import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, type FindOperator, type Repository } from "typeorm";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import type { ShipOrderDto, ShipReservationItemDto } from "./dto/ship-order.dto";
import { Order } from "./entities/order.entity";
import { AddressService } from "src/address/address.service";
import { OrderProductService } from "src/order-product/order-product.service";
import { ProductService } from "src/product/product.service";
import { CartDiscountsService } from "src/cart-discounts/cart-discounts.service";
import { PromotionsService } from "src/promotions/promotions.service";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { TransfersService } from "src/transfers/transfers.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly addressRepository: AddressService,
    private readonly orderProductRepository: OrderProductService,
    private readonly productRepository: ProductService,
    private readonly cartDiscountsRepository: CartDiscountsService,
    private readonly promotionsRepository: PromotionsService,
    private readonly productStockRepository: ProductStockService,
    private readonly warehouseService: WarehouseService,
    private readonly transfersService: TransfersService,
  ) {}

  async ship(payload: ShipOrderDto) {
    const createdTransferIds: number[] = [];

    try {
      for (const transfer of payload.transfers) {
        const created = await this.transfersService.create(transfer);
        createdTransferIds.push(created.id);
      }

      for (const item of payload.reservations) {
        await this.syncReservationsForOrderProduct(item);
      }

      const findTransfer = payload.transfers.find((el) => el.order_id);

      if (findTransfer) {
        await this.ordersRepository.update(findTransfer.order_id, { status: "processing" });
      }
    } catch (error) {
      for (const id of createdTransferIds) {
        await this.transfersService.remove(id);
      }
      throw error;
    }
  }

  private async syncReservationsForOrderProduct(item: ShipReservationItemDto) {
    const orderProduct = await this.orderProductRepository.findOne(item.id);

    if (!orderProduct) {
      throw `Товар заказа с ID ${item.id} не найден`;
    }

    const reservations = orderProduct.reservations || [];
    const newReservations = item.reservations;

    const oldMap = new Map(reservations.map((r) => [r.stock_id, r]));
    const newMap = new Map(newReservations.map((r) => [r.stock_id, r]));

    for (const [stockId, old] of oldMap) {
      if (!newMap.has(stockId)) {
        await this.productStockRepository.decrementReserved(stockId, old.quantity);
      }
    }

    for (const [stockId, newRes] of newMap) {
      const old = oldMap.get(stockId);
      if (old && newRes.quantity < old.quantity) {
        await this.productStockRepository.decrementReserved(
          stockId,
          old.quantity - newRes.quantity,
        );
      }
    }

    for (const [stockId, newRes] of newMap) {
      const old = oldMap.get(stockId);
      const oldQty = old?.quantity ?? 0;
      if (newRes.quantity > oldQty) {
        await this.productStockRepository.incrementReserved(stockId, newRes.quantity - oldQty);
      }
    }

    await this.orderProductRepository.update(item.id, { reservations: newReservations });
  }

  async create(createOrderDto: CreateOrderDto): Promise<any> {
    const { total, subtotal, discount_quantity, products, productOptionsMap } =
      await this.productRepository.calculatePricesForOrder(
        createOrderDto.products,
        createOrderDto.user_role,
      );
    let discount_total = 0;
    let discount_percent = 0;
    let discount_name = "";
    let delivery_price = createOrderDto.method_receipt === "courier" ? 100 : 0;

    const cartDiscount = await this.cartDiscountsRepository.getCartDiscountForOrder(
      total,
      createOrderDto.user_role,
    );

    const promotion = await this.promotionsRepository.getPromotionForOrder();

    if (
      cartDiscount.discount_percent > 0 &&
      cartDiscount.discount_percent > promotion.discount_percent
    ) {
      discount_total = (total * cartDiscount.discount_percent) / 100;
      discount_percent = cartDiscount.discount_percent;
      discount_name = cartDiscount.discount_name;
    } else if (
      promotion.discount_percent > 0 &&
      promotion.discount_percent >= cartDiscount.discount_percent
    ) {
      discount_total = (total * promotion.discount_percent) / 100;
      discount_percent = promotion.discount_percent;
      discount_name = promotion.discount_name;
    }

    const warehouse = await this.warehouseService.findBaseWarehouseForOrder(
      createOrderDto?.address?.lng,
      createOrderDto?.address?.lat,
    );

    const order = await this.ordersRepository
      .save({
        comment: createOrderDto.comment,
        create_user_id: createOrderDto.create_user_id,
        date_from: createOrderDto.date_from,
        date_to: createOrderDto.date_to,
        phone: createOrderDto.phone,
        phoneCode: createOrderDto.phoneCode,
        recipient_name: createOrderDto.recipient_name,
        payment_method: createOrderDto.payment_method,
        method_receipt: createOrderDto.method_receipt,
        discount_name,
        discount_quantity: Math.floor(discount_quantity),
        discount_percent: Math.floor(discount_percent),
        discount_total: Math.floor(discount_total),
        subtotal: Math.floor(subtotal),
        total: Math.floor(total - discount_total + delivery_price),
        order_number: "",
        warehouse,
        address: {
          entrance: createOrderDto.address.entrance,
          flat: createOrderDto.address.flat,
          floor: createOrderDto.address.floor,
          intercom: createOrderDto.address.intercom,
          name: createOrderDto.address.name,
          place: createOrderDto.address.place,
          lng: createOrderDto.address.lng,
          lat: createOrderDto.address.lat,
          type: createOrderDto.method_receipt,
        },
      })
      .catch((error) => {
        throw `Не удалось создать заказ, ${error.message}`;
      });

    order.order_number = await this.generateOrderNumber(order.id);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const quantity = productOptionsMap.get(product.id)?.quantity || 0;

      const reservations = await this.productStockRepository.reservedProductsForOrder(
        products[i].id,
        quantity,
        createOrderDto?.address?.lng,
        createOrderDto?.address?.lat,
      );

      await this.orderProductRepository.create({
        reservations,
        order_id: order.id,
        price: productOptionsMap.get(product.id)?.price || 0,
        quantity,
        product_id: product.id,
        name: product.name,
        code: product.code,
        brand_id: product.brand_id,
        category_id: product.category_id,
        description: product.description,
        country: product.country,
        product_type: product.product_type,
        equipment: product.equipment,
        weight: product.weight,
        height: product.height,
        length: product.length,
        width: product.width,
        purchase_price: 0,
      });
    }

    return order;
  }

  async generateOrderNumber(orderId: number): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    const orderNumber = `${y}${m}${d}${orderId}`;

    await this.ordersRepository.update(orderId, { order_number: orderNumber }).catch((error) => {
      throw `Не удалось сгенерировать номер заказа, ${error.message}`;
    });

    return orderNumber;
  }

  async findAll(page: string, limit: string, order_number?: string, status?: string) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: Record<string, any> = {};

    if (order_number) {
      whereCondition.order_number = ILike(`%${order_number}%`);
    }

    if (status) {
      whereCondition.status = status;
    }

    return this.ordersRepository
      .findAndCount({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список заказов, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.ordersRepository
      .findOne({
        where: { id },
        relations: ["address", "warehouse"],
      })
      .catch((error) => {
        throw `Не удалось получить заказ, ${error.message}`;
      });
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    return this.ordersRepository.update(id, updateOrderDto).catch((error) => {
      throw `Не удалось изменить заказ, ${error.message}`;
    });
  }

  async rejectOrder(id: number, rejected_reason: string, user_id?: number, user_role?: string) {
    if (!user_id || !user_role) {
      throw "Не найдена информация о пользователе который совершает действие";
    }

    const order = await this.findOne(id);

    if (!order) {
      throw `Заказ ${id} не найден`;
    }

    if (user_id !== order.create_user_id && user_role !== "admin" && user_role !== "moderator") {
      throw `Недостаточно прав для отмены заказа ${id}`;
    }

    const statusMap: Record<string, Order["status"]> = {
      new: user_id === order.create_user_id ? "cancelled_customer" : "cancelled_new",
      processing: user_id === order.create_user_id ? "cancelled_customer" : "cancelled_assembly",
      ready: user_id === order.create_user_id ? "cancelled_customer" : "cancelled_ready",
      in_delivery: user_id === order.create_user_id ? "cancelled_customer" : "cancelled_delivery",
    };

    const status = statusMap[order.status];

    if (!status) {
      throw `Невозможно отменить заказ в статусе ${order.status}`;
    }

    await this.ordersRepository
      .update(id, {
        status,
        rejected_reason,
      })
      .catch((error) => {
        throw `Не удалось отменить заказ, ${error.message}`;
      });

    await this.releaseReservations(order.id);

    if (order.status === "processing") {
      await this.transfersService.updateStatusByOrderAndType(id, "transfer", "rejected");
    }

    if (order.status === "in_delivery") {
      await this.transfersService.updateStatusByOrderAndType(id, "delivery", "rejected");
    }
  }

  private async releaseReservations(order_id: number) {
    const orderProducts = await this.orderProductRepository.findAll(String(order_id));

    for (let i = 0; i < orderProducts.length; i++) {
      const reservations = orderProducts[i].reservations;

      if (!Array.isArray(reservations)) continue;

      for (let j = 0; j < reservations.length; j++) {
        const reservation = reservations[j];

        await this.productStockRepository.decrementReserved(
          reservation.stock_id,
          reservation.quantity,
        );
      }
    }
  }

  async changeStatus(id: number) {
    const order = await this.findOne(id);

    if (!order) {
      throw `Заказ ${id} не найден`;
    }

    const statusMap: Record<string, string> = {
      new: "processing",
      processing: "ready",
      ready: order.method_receipt === "courier" ? "in_delivery" : "completed",
      in_delivery: "completed",
    };

    const status = statusMap[order.status] || "";

    if (!status) {
      throw `Невозможно перевести заказ в следующий статус из статуса ${order.status}`;
    }

    if (order.status === "processing" && status === "ready") {
      await this.handleReadyTransfers(order.id, order.warehouse?.id || 0);
    }

    if (order.status === "ready" && status === "in_delivery") {
      await this.handleInDeliveryTransfer(
        order.id,
        order.warehouse?.id || 0,
        order.address?.id || 0,
      );
    }

    if ((order.status === "in_delivery" || order.status === "ready") && status === "completed") {
      await this.handleCompletedTransfers(order.id);
    }

    if (order.status === "in_delivery" && status === "completed") {
      await this.transfersService.updateStatusByOrderAndType(order.id, "delivery", "completed");
    }

    await this.ordersRepository.update(id, { status: status as Order["status"] }).catch((error) => {
      throw `Не удалось изменить статус заказа, ${error.message}`;
    });
  }

  private async handleCompletedTransfers(order_id: number) {
    const orderProducts = await this.orderProductRepository.findAll(String(order_id));

    for (let i = 0; i < orderProducts.length; i++) {
      const reservations = orderProducts[i].reservations;
      if (!reservations || reservations.length === 0) continue;

      for (let j = 0; j < reservations.length; j++) {
        await this.productStockRepository.decrementQuantityAndReserved(
          reservations[j].stock_id,
          reservations[j].quantity,
        );
      }
    }
  }

  private async handleInDeliveryTransfer(
    order_id: number,
    from_warehouse_id?: number,
    address_id?: number,
  ) {
    if (!from_warehouse_id) {
      throw `У заказа ${order_id} не указан склад отправки`;
    }

    if (!address_id) {
      throw `У заказа ${order_id} не указан адрес доставки`;
    }

    await this.transfersService.create({
      type: "delivery",
      order_id,
      from_warehouse_id,
      address_id,
    });
  }

  private async handleReadyTransfers(order_id: number, warehouse_id: number) {
    const transfers = await this.transfersService.findByOrderId(order_id);

    if (Array.isArray(transfers)) {
      let baseWarehouseId: number = warehouse_id;

      if (!baseWarehouseId) {
        for (let i = 0; i < transfers.length; i++) {
          if (transfers[i]?.to_warehouse && typeof transfers[i]?.to_warehouse?.id === "number") {
            baseWarehouseId = transfers[i]?.to_warehouse?.id || 0;
            break;
          }
        }
      }

      if (!baseWarehouseId) {
        throw `У заказа ${order_id} не найден склад выдачи`;
      }

      const orderProducts = await this.orderProductRepository.findAll(String(order_id));

      for (let i = 0; i < orderProducts.length; i++) {
        const reservations = orderProducts[i].reservations;

        if (reservations.length === 0) continue;

        let baseStock: { stock_id: number; warehouse_id: number; quantity: number } | null = null;
        const transfersHistory: { stock_id: number; warehouse_id: number; quantity: number }[] = [];

        let needAddQuantity = 0;

        for (let j = 0; j < reservations.length; j++) {
          if (reservations[j].warehouse_id === baseWarehouseId) {
            baseStock = reservations[j];
          } else {
            needAddQuantity += reservations[j].quantity;
            transfersHistory.push(reservations[j]);
          }
        }

        if (baseStock && baseStock.stock_id) {
          await this.productStockRepository.incrementQuantityAndReserved(
            baseStock.stock_id,
            needAddQuantity,
          );
          baseStock.quantity += needAddQuantity;
        } else {
          const stock = await this.productStockRepository.findByProductAndWarehouse(
            orderProducts[i].product_id,
            baseWarehouseId,
          );

          if (stock) {
            await this.productStockRepository.incrementQuantityAndReserved(
              stock.id,
              needAddQuantity,
            );
            baseStock = {
              stock_id: stock.id,
              quantity: stock.quantity + needAddQuantity,
              warehouse_id: baseWarehouseId,
            };
          } else {
            const newStock = await this.productStockRepository.create({
              warehouse_id: baseWarehouseId,
              product_id: orderProducts[i].product_id,
              in_stock: false,
              quantity: needAddQuantity,
              reserved: needAddQuantity,
            });
            baseStock = {
              stock_id: newStock.id,
              quantity: needAddQuantity,
              warehouse_id: baseWarehouseId,
            };
          }
        }

        for (let k = 0; k < transfersHistory.length; k++) {
          await this.productStockRepository.decrementQuantityAndReserved(
            transfersHistory[k].stock_id,
            transfersHistory[k].quantity,
          );
        }

        await this.orderProductRepository.update(orderProducts[i].id, {
          reservations: [baseStock],
          transfers: transfersHistory,
        });
      }

      await this.transfersService.updateStatusByOrderAndType(order_id, "transfer", "completed");
    }
  }

  async getStats() {
    const result = await this.ordersRepository
      .createQueryBuilder("order")
      .select([
        'COALESCE(SUM(order.total), 0) AS "total"',
        'COALESCE(SUM(CASE WHEN order.payment_method = \'card\' THEN order.total ELSE 0 END), 0) AS "totalCart"',
        'COALESCE(SUM(CASE WHEN order.payment_method = \'cash\' THEN order.total ELSE 0 END), 0) AS "totalCash"',
        'COUNT(order.id) AS "ordersCount"',
        'COALESCE(SUM(order.discount_total), 0) AS "discount"',
      ])
      .where("order.status = 'completed'")
      .getRawOne();

    const total = Number(result.total);
    const ordersCount = Number(result.ordersCount);

    return {
      total,
      totalCart: Number(result.totalCart),
      totalCash: Number(result.totalCash),
      averageCheck: ordersCount > 0 ? Math.round(total / ordersCount) : 0,
      ordersCount,
      discount: Number(result.discount),
    };
  }

  async delete(id: number) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ["address"],
    });

    await this.ordersRepository.delete(id).catch((error) => {
      throw `Не удалось удалить заказ, ${error.message}`;
    });

    if (order?.address?.id) {
      await this.addressRepository.remove(order.address.id);
    }

    return null;
  }
}
