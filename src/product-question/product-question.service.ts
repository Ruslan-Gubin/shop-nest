import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
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

  async findByProductId(id: number, page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productQuestionRepository
      .findAndCount({
        skip,
        take: Number(limit),
        where: { product: { id }, answer: Not("") },
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить вопросы, ${error.message}`;
      });
  }

  async findAll(page: number, limit: number) {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productQuestionRepository
      .findAndCount({
        skip,
        take: Number(limit),
        order: { answer: "ASC", id: "DESC" },
      })
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
