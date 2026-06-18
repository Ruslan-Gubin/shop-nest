import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { Product } from "./entities/product.entity";
import { ProductStockModule } from "src/product-stock/product-stock.module";
import { ProductPriceModule } from "src/product-price/product-price.module";

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ProductStockModule, ProductPriceModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
