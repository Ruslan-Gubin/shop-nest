import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { CreateProductQuestionDto } from "./dto/create-product-question.dto";
import { UpdateProductQuestionDto } from "./dto/update-product-question.dto";
import { GenerateAnswerDto } from "./dto/generate-answer.dto";
import { ProductQuestion } from "./entities/product-question.entity";
import { OpenCodeService } from "src/opencode/opencode.service";
import { ProductService } from "src/product/product.service";
import { ProductSpecificationService } from "src/product-specification/product-specification.service";

@Injectable()
export class ProductQuestionService {
  constructor(
    @InjectRepository(ProductQuestion)
    private productQuestionRepository: Repository<ProductQuestion>,
    private readonly openCode: OpenCodeService,
    private readonly productService: ProductService,
    private readonly productSpecificationService: ProductSpecificationService,
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

  async generateAnswer(dto: GenerateAnswerDto) {
    const product = await this.productService.findOne(dto.product_id);

    if (!product) {
      throw "Не удалось получить товар для вопроса";
    }

    const categoryPath = product?.category_id
      ? await this.productService.getFullPathCategories(product.id)
      : [];

    const category = categoryPath.map((item) => item.name).join(" / ");

    const specifications = await this.productSpecificationService.findByProductId(product.id);

    const specificationsText =
      specifications.length > 0
        ? specifications
            .map(
              (item) =>
                `- ${item.specification?.name ? item.specification.name : "Характеристика"}: ${item.value}`,
            )
            .join("\n")
        : "Отсутствуют";

    const validAnswer = `{
      "answer": "Текст ответа покупателю"
    }`;

    const prompt = `
Ты — консультант интернет-магазина. Твоя задача — составить ответ покупателю на его вопрос о товаре.

Данные о товаре:
- Название: ${product.name ? product.name : "Отсутствует"}
- Бренд: ${product.brand_name ? product.brand_name : "Отсутствует"}
- Категория: ${category ? category : "Отсутствует"}
- Описание: ${product.description ? product.description : "Отсутствует"}
- Страна: ${product.country ? product.country : "Отсутствует"}
- Тип: ${product.product_type ? product.product_type : "Отсутствует"}
- Комплектация: ${product.equipment ? product.equipment : "Отсутствует"}
- Характеристики:
${specificationsText}

Вопрос покупателя: "${dto.question}"

Дополнительный контекст от администратора (может содержать инструкции, уточнения или справочную информацию): ${dto.context ? `"${dto.context}"` : "Отсутствует"}

Правила ответа:
1. Отвечай ТОЛЬКО на основе фактов из данных о товаре, ничего не выдумывай.
2. Если в данных о товаре нет информации, необходимой для ответа — честно скажи об этом и предложи покупателю уточнить детали (например, связаться с поддержкой).
3. Учти дополнительный контекст администратора, если он задан — он приоритетнее общих данных о товаре.
4. Тон — вежливый и дружелюбный консультант, грамотный русский язык.
5. Ответ должен быть кратким: 2-4 предложения, без воды и канцелярита.
6. Не используй markdown-разметку, списки и эмодзи.

Правила формата:
- Верни ТОЛЬКО JSON в виде ${validAnswer}
- Никаких префиксов, пояснений, нумерации и markdown-блоков
- Если ответ сформировать невозможно — верни JSON с пустой строкой: {"answer": ""}
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : null;

        return json && Object.hasOwn(json, "answer") && typeof json.answer === "string"
          ? json.answer
          : "";
      })
      .catch((error) => {
        throw `Ошибка генерации ответа: ${error instanceof Error ? error.message : String(error)}`;
      });
  }
}
