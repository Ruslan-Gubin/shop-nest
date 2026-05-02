import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PriceFillService } from "./price-fill.service";
import { PriceFillController } from "./price-fill.controller";
import { PriceFill } from "./entities/price-fill.entity";
import { PriceTypeModule } from "src/price-type/price-type.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceFill]),
    PriceTypeModule,
  ],
  controllers: [PriceFillController],
  providers: [PriceFillService],
  exports: [PriceFillService],
})
export class PriceFillModule {}