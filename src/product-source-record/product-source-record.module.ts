import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductModule } from "src/product/product.module";
import { ProductPriceModule } from "src/product-price/product-price.module";
import { PriceTypeModule } from "src/price-type/price-type.module";
import { ProductSpecificationModule } from "src/product-specification/product-specification.module";
import { SpecificationsModule } from "src/specifications/specifications.module";
import { CategoryModule } from "src/category/category.module";
import { ProductSourceRecord } from "./entities/product-source-record.entity";
import { ProductSourceRecordController } from "./product-source-record.controller";
import { ProductSourceRecordService } from "./product-source-record.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductSourceRecord]),
    ProductModule,
    ProductPriceModule,
    PriceTypeModule,
    ProductSpecificationModule,
    SpecificationsModule,
    CategoryModule,
  ],
  controllers: [ProductSourceRecordController],
  providers: [ProductSourceRecordService],
  exports: [ProductSourceRecordService],
})
export class ProductSourceRecordModule {}
