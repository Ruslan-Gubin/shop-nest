import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { Product } from "./entities/product.entity";
import { ProductStockModule } from "src/product-stock/product-stock.module";
import { ProductPriceModule } from "src/product-price/product-price.module";
import { CategoryModule } from "src/category/category.module";
import { SearchModule } from "src/search/search.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ProductStockModule,
    ProductPriceModule,
    CategoryModule,
    SearchModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
