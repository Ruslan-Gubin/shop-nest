import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PriceRangeService } from "./price-range.service";
import { PriceRangeController } from "./price-range.controller";
import { PriceRange } from "./entities/price-range.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PriceRange])],
  controllers: [PriceRangeController],
  providers: [PriceRangeService],
  exports: [PriceRangeService],
})
export class PriceRangeModule {}