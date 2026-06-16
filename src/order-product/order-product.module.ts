import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderProductService } from "./order-product.service";
import { OrderProductController } from "./order-product.controller";
import { OrderProduct } from "./entities/order-product.entity";
import { ProductModule } from "src/product/product.module";
import { ProductPriceModule } from "src/product-price/product-price.module";

@Module({
  imports: [TypeOrmModule.forFeature([OrderProduct]), ProductModule, ProductPriceModule],
  controllers: [OrderProductController],
  providers: [OrderProductService],
  exports: [OrderProductService],
})
export class OrderProductModule {}
