import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductQuestion } from "./entities/product-question.entity";
import { ProductQuestionController } from "./product-question.controller";
import { ProductQuestionService } from "./product-question.service";

@Module({
  imports: [TypeOrmModule.forFeature([ProductQuestion])],
  controllers: [ProductQuestionController],
  providers: [ProductQuestionService],
  exports: [ProductQuestionService],
})
export class ProductQuestionModule {}
