import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OpenCodeModule } from "src/opencode/opencode.module";
import { ProductModule } from "src/product/product.module";
import { ProductSourceRecord } from "./entities/product-source-record.entity";
import { ProductSourceRecordController } from "./product-source-record.controller";
import { ProductSourceRecordService } from "./product-source-record.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductSourceRecord]),
    OpenCodeModule,
    ProductModule,
  ],
  controllers: [ProductSourceRecordController],
  providers: [ProductSourceRecordService],
  exports: [ProductSourceRecordService],
})
export class ProductSourceRecordModule {}
