import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductReviewController } from "./product-review.controller";
import { ProductReviewService } from "./product-review.service";
import { ProductReview } from "./entities/product-review.entity";
import { OrderProduct } from "src/order-product/entities/order-product.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductReview, OrderProduct])],
  controllers: [ProductReviewController],
  providers: [ProductReviewService],
  exports: [ProductReviewService],
})
export class ProductReviewModule {}
