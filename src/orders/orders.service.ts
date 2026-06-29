import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import { Order } from "./entities/order.entity";
import { AddressService } from "src/address/address.service";
import { OrderProductService } from "src/order-product/order-product.service";
import { ProductService } from "src/product/product.service";
import { CartDiscountsService } from "src/cart-discounts/cart-discounts.service";
import { PromotionsService } from "src/promotions/promotions.service";
import { ProductStockService } from "src/product-stock/product-stock.service";

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
  ) {}

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
