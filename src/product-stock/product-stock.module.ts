import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductStockController } from "./product-stock.controller";
import { ProductStockService } from "./product-stock.service";
import { ProductStock } from "./entities/product-stock.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductStock])],
  controllers: [ProductStockController],
  providers: [ProductStockService],
  exports: [ProductStockService],
})
export class ProductStockModule {}
