import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReceiptController } from "./receipt.controller";
import { ReceiptService } from "./receipt.service";
import { Receipt } from "./entities/receipt.entity";
import { ProductModule } from "src/product/product.module";
import { ProductStockModule } from "src/product-stock/product-stock.module";
import { ProductPriceModule } from "src/product-price/product-price.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt]),
    ProductModule,
    ProductStockModule,
    ProductPriceModule,
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService],
})
export class ReceiptModule {}
