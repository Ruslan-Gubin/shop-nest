import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PriceTypeService } from "./price-type.service";
import { PriceTypeController } from "./price-type.controller";
import { PriceType } from "./entities/price-type.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PriceType])],
  controllers: [PriceTypeController],
  providers: [PriceTypeService],
})
export class PriceTypeModule {}