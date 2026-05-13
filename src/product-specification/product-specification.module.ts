import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductSpecificationService } from "./product-specification.service";
import { ProductSpecificationController } from "./product-specification.controller";
import { ProductSpecification } from "./entities/product-specification.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductSpecification])],
  controllers: [ProductSpecificationController],
  providers: [ProductSpecificationService],
  exports: [ProductSpecificationService],
})
export class ProductSpecificationModule {}