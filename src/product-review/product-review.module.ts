import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductReviewController } from "./product-review.controller";
import { ProductReviewService } from "./product-review.service";
import { ProductReview } from "./entities/product-review.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductReview])],
  controllers: [ProductReviewController],
  providers: [ProductReviewService],
  exports: [ProductReviewService],
})
export class ProductReviewModule {}
