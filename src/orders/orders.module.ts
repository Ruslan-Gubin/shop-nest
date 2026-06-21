import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order } from "./entities/order.entity";
import { AddressModule } from "src/address/address.module";
import { OrderProductModule } from "src/order-product/order-product.module";
import { ProductModule } from "src/product/product.module";
import { CartDiscountsModule } from "src/cart-discounts/cart-discounts.module";
import { PromotionsModule } from "src/promotions/promotions.module";
import { ProductStockModule } from "src/product-stock/product-stock.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    AddressModule,
    OrderProductModule,
    ProductModule,
    CartDiscountsModule,
    PromotionsModule,
    ProductStockModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
