import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CartDiscountsService } from "./cart-discounts.service";
import { CartDiscountsController } from "./cart-discounts.controller";
import { CartDiscount } from "./entities/cart-discount.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CartDiscount])],
  controllers: [CartDiscountsController],
  providers: [CartDiscountsService],
})
export class CartDiscountsModule {}