import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import type { CreateProductReviewDto } from "./dto/create-product-review.dto";
import type { UpdateProductReviewDto } from "./dto/update-product-review.dto";
import { ProductReview } from "./entities/product-review.entity";
import type { Product } from "src/product/entities/product.entity";
import { OrderProduct } from "src/order-product/entities/order-product.entity";

@Injectable()
export class ProductReviewService {
  constructor(
    @InjectRepository(ProductReview)
    private productReviewRepository: Repository<ProductReview>,
    @InjectRepository(OrderProduct)
    private orderProductRepository: Repository<OrderProduct>,
  ) {}

  async create(createProductReviewDto: CreateProductReviewDto) {
    return this.productReviewRepository
      .save({
        product: { id: createProductReviewDto.product_id },
        create_user_id: createProductReviewDto.create_user_id,
        rating: createProductReviewDto.rating,
        dignities: createProductReviewDto.dignities ?? "",
        disadvantages: createProductReviewDto.disadvantages ?? "",
        comment: createProductReviewDto.comment ?? "",
      })
      .catch((error) => {
        throw `Не удалось добавить отзыв, ${error.message}`;
      });
  }

  async findByProductId(id: number, page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productReviewRepository
      .findAndCount({
        skip,
        take: Number(limit),
        where: { product: { id } },
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить отзывы товара, ${error.message}`;
      });
  }

  async findByUserId(
    userId: number,
    page: number,
    limit: number,
  ): Promise<[ProductReview[], number]> {
    const skip = (page - 1) * limit;

    return this.productReviewRepository
      .findAndCount({
        where: { create_user_id: userId },
        relations: ["product"],
        order: { id: "DESC" },
        skip,
        take: limit,
      })
      .catch((error) => {
        throw `Не удалось получить отзывы пользователя, ${error.message}`;
      });
  }

  async findAll(page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productReviewRepository
      .findAndCount({
        skip,
        take: Number(limit),
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить отзывы, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.productReviewRepository
      .findOne({
        where: { id },
        relations: ["product"],
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

  async answerReview(id: number, answer: string) {
    return this.productReviewRepository.update(id, { answer }).catch((error) => {
      throw `Не удалось добавить ответ на отзыв, ${error.message}`;
    });
  }

  async remove(id: number) {
    return this.productReviewRepository.delete(id).catch((error) => {
      throw `Не удалось удалить отзыв, ${error.message}`;
    });
  }

  async findMyReview(productId: number, userId: number): Promise<ProductReview | null> {
    return this.productReviewRepository
      .findOne({
        where: { product: { id: productId }, create_user_id: userId },
      })
      .catch((error) => {
        throw `Не удалось получить отзыв, ${error.message}`;
      });
  }

  async canReview(productId: number, userId: number): Promise<boolean> {
    return !!(await this.orderProductRepository
      .createQueryBuilder("op")
      .innerJoin("op.order", "o")
      .where("op.product_id = :productId", { productId })
      .andWhere("o.create_user_id = :userId", { userId })
      .andWhere("o.status = :status", { status: "completed" })
      .getOne()
      .catch((error) => {
        throw `Не удалось проверить возможность оставить отзыв, ${error.message}`;
      }));
  }

  async attachReviewStats(products: Product[]): Promise<void> {
    const ids = products.map((p) => p.id);
    if (!ids.length) return;

    const stats = await this.productReviewRepository
      .createQueryBuilder("pr")
      .select("pr.product_id", "product_id")
      .addSelect("COALESCE(AVG(pr.rating), 0)", "rating")
      .addSelect("COUNT(pr.id)", "review_count")
      .where("pr.product_id IN (:...ids)", { ids })
      .groupBy("pr.product_id")
      .getRawMany<{ product_id: number; rating: string; review_count: string }>()
      .catch((error) => {
        throw `Не удалось получить рейтинг товаров, ${error.message}`;
      });

    const statsMap = new Map(
      stats.map((s) => [
        s.product_id,
        {
          rating: Math.round(Number(s.rating) * 10) / 10,
          review_count: Number(s.review_count),
        },
      ]),
    );

    for (const product of products) {
      const s = statsMap.get(product.id);
      if (s) {
        product.rating = s.rating;
        product.review_count = s.review_count;
      } else {
        product.rating = 0;
        product.review_count = 0;
      }
    }
  }
}
