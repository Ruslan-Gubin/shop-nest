import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { CreateProductQuestionDto } from "./dto/create-product-question.dto";
import { UpdateProductQuestionDto } from "./dto/update-product-question.dto";
import { ProductQuestion } from "./entities/product-question.entity";

@Injectable()
export class ProductQuestionService {
  constructor(
    @InjectRepository(ProductQuestion)
    private productQuestionRepository: Repository<ProductQuestion>,
  ) {}

  async create(createDto: CreateProductQuestionDto) {
    return this.productQuestionRepository
      .save({
        product: { id: createDto.product_id },
        question: createDto.question,
        create_user_id: createDto.create_user_id ? createDto.create_user_id : null,
      })
      .catch((error) => {
        throw `Не удалось добавить вопрос, ${error.message}`;
      });
  }

  async findByProductId(id: number, page: number, limit: number, create_user_id?: number) {
    const skip = (Number(page) - 1) * Number(limit);

    const query = this.productQuestionRepository
      .createQueryBuilder("pq")
      .where("pq.product_id = :id", { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where("pq.answer != ''");
          if (create_user_id) {
            qb.orWhere("pq.create_user_id = :create_user_id", {
              create_user_id,
            });
          }
        }),
      )
      .orderBy("pq.id", "DESC")
      .skip(skip)
      .take(Number(limit));

    return query.getManyAndCount().catch((error) => {
      throw `Не удалось получить вопросы, ${error.message}`;
    });
  }

  async findByUserId(
    userId: number,
    page: number,
    limit: number,
  ): Promise<[ProductQuestion[], number]> {
    const skip = (page - 1) * limit;

    return this.productQuestionRepository
      .findAndCount({
        where: { create_user_id: userId },
        relations: ["product"],
        order: { id: "DESC" },
        skip,
        take: limit,
      })
      .catch((error) => {
        throw `Не удалось получить вопросы пользователя, ${error.message}`;
      });
  }

  async findByProductAndUserId(
    product_id: number,
    create_user_id: number,
    page: number,
    limit: number,
  ): Promise<[ProductQuestion[], number]> {
    const skip = (page - 1) * limit;

    return this.productQuestionRepository
      .findAndCount({
        where: { product: { id: product_id }, create_user_id },
        order: { id: "DESC" },
        skip,
        take: limit,
      })
      .catch((error) => {
        throw `Не удалось получить вопросы пользователя по товару, ${error.message}`;
      });
  }

  async findAll(page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productQuestionRepository
      .createQueryBuilder("pq")
      .orderBy("CASE WHEN COALESCE(pq.answer, '') = '' THEN 0 ELSE 1 END", "ASC")
      .addOrderBy("pq.id", "DESC")
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount()
      .catch((error) => {
        throw `Не удалось получить вопросы, ${error.message}`;
      });
  }

  async findAllUnanswered(page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productQuestionRepository
      .findAndCount({
        skip,
        take: Number(limit),
        where: { answer: "" },
        relations: ["product"],
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить неотвеченные вопросы, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.productQuestionRepository
      .findOne({ where: { id }, relations: ["product"] })
      .catch((error) => {
        throw `Не удалось получить вопрос, ${error.message}`;
      });
  }

  async update(id: number, updateDto: UpdateProductQuestionDto) {
    return this.productQuestionRepository.update(id, updateDto).catch((error) => {
      throw `Не удалось обновить вопрос, ${error.message}`;
    });
  }

  async remove(id: number) {
    return this.productQuestionRepository.delete(id).catch((error) => {
      throw `Не удалось удалить вопрос, ${error.message}`;
    });
  }
}
