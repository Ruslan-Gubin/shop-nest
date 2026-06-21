import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductStockController } from "./product-stock.controller";
import { ProductStockService } from "./product-stock.service";
import { ProductStock } from "./entities/product-stock.entity";
import { WarehouseModule } from "src/warehouse/warehouse.module";
import { AddressModule } from "src/address/address.module";

@Module({
  imports: [TypeOrmModule.forFeature([ProductStock]), AddressModule],
  controllers: [ProductStockController],
  providers: [ProductStockService],
  exports: [ProductStockService],
})
export class ProductStockModule {}
