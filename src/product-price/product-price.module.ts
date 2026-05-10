import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductPriceService } from "./product-price.service";
import { ProductPriceController } from "./product-price.controller";
import { ProductPrice } from "./entities/product-price.entity";
import { ProductModule } from "src/product/product.module";
import { PriceTypeModule } from "src/price-type/price-type.module";

@Module({
  imports: [TypeOrmModule.forFeature([ProductPrice]), ProductModule, PriceTypeModule],
  controllers: [ProductPriceController],
  providers: [ProductPriceService],
  exports: [ProductPriceService],
})
export class ProductPriceModule {}
