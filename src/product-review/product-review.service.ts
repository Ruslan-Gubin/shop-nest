import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import type { CreateProductReviewDto } from "./dto/create-product-review.dto";
import type { UpdateProductReviewDto } from "./dto/update-product-review.dto";
import { ProductReview } from "./entities/product-review.entity";

@Injectable()
export class ProductReviewService {
  constructor(
    @InjectRepository(ProductReview)
    private productReviewRepository: Repository<ProductReview>,
  ) {}

  async create(createProductReviewDto: CreateProductReviewDto) {
    return this.productReviewRepository
      .save({
        product: { id: createProductReviewDto.product_id },
        create_user_id: createProductReviewDto.create_user_id,
        text: createProductReviewDto.text ?? "",
        rating: createProductReviewDto.rating ?? 0,
      })
      .catch((error) => {
        throw `Не удалось добавить отзыв, ${error.message}`;
      });
  }

  async findByProductId(product_id: number) {
    return this.productReviewRepository
      .find({
        where: { product: { id: product_id } },
        order: { created_at: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить отзывы товара, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.productReviewRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить отзыв, ${error.message}`;
      });
  }

  async update(id: number, updateProductReviewDto: UpdateProductReviewDto) {
    return this.productReviewRepository.update(id, updateProductReviewDto).catch((error) => {
      throw `Не удалось изменить отзыв, ${error.message}`;
    });
  }

  async remove(id: number) {
    return this.productReviewRepository.delete(id).catch((error) => {
      throw `Не удалось удалить отзыв, ${error.message}`;
    });
  }
}
