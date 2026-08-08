import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductReviewController } from "./product-review.controller";
import { ProductReviewService } from "./product-review.service";
import { ProductReview } from "./entities/product-review.entity";
import { OrderProduct } from "src/order-product/entities/order-product.entity";
import { OpenCodeModule } from "src/opencode/opencode.module";
import { CategoryModule } from "src/category/category.module";
import { ProductSpecificationModule } from "src/product-specification/product-specification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview, OrderProduct]),
    OpenCodeModule,
    CategoryModule,
    ProductSpecificationModule,
  ],
  controllers: [ProductReviewController],
  providers: [ProductReviewService],
  exports: [ProductReviewService],
})
export class ProductReviewModule {}
