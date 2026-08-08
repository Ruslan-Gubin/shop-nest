import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductQuestion } from "./entities/product-question.entity";
import { ProductQuestionController } from "./product-question.controller";
import { ProductQuestionService } from "./product-question.service";
import { OpenCodeModule } from "src/opencode/opencode.module";
import { ProductModule } from "src/product/product.module";
import { ProductSpecificationModule } from "src/product-specification/product-specification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductQuestion]),
    OpenCodeModule,
    ProductModule,
    ProductSpecificationModule,
  ],
  controllers: [ProductQuestionController],
  providers: [ProductQuestionService],
  exports: [ProductQuestionService],
})
export class ProductQuestionModule {}
