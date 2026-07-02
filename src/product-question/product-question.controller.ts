import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { ProductQuestionService } from "./product-question.service";
import { CreateProductQuestionDto } from "./dto/create-product-question.dto";
import { UpdateProductQuestionDto } from "./dto/update-product-question.dto";
import { ResponseData, responseData } from "src/helpers/response";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { ProductQuestion } from "./entities/product-question.entity";

@Controller("product-question")
export class ProductQuestionController {
  constructor(private readonly productQuestionService: ProductQuestionService) {}

  @Post("create")
  async create(
    @Body() createDto: CreateProductQuestionDto,
    @CurrentUser() user?: CurrentStrategyUser,
  ): Promise<ResponseData<any>> {
    try {
      const question = await this.productQuestionService.create({
        ...createDto,
        create_user_id: user ? user.sub : undefined,
      });
      return responseData(question, "success", [], "Вопрос успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product/:product_id")
  async getByProduct(
    @Param("product_id") product_id: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
  ): Promise<
    ResponseData<{
      questions: ProductQuestion[];
      totalCount: number;
      paginationPage: number;
    } | null>
  > {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const pageNum = page ? parseInt(page, 10) : 1;

      const [questions, totalCount] = await this.productQuestionService.findByProductId(
        Number(product_id),
        pageNum,
        limitNum,
      );

      return responseData(
        { questions, totalCount, paginationPage: pageNum },
        "success",
        [],
        "Вопросы получены",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async getOne(@Param("id") id: string): Promise<ResponseData<any>> {
    try {
      const question = await this.productQuestionService.findOne(Number(id));
      return responseData(question, "success", [], "Вопрос получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateProductQuestionDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productQuestionService.update(Number(id), updateDto);
      return responseData(null, "success", [], "Вопрос успешно обновлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productQuestionService.remove(Number(id));
      return responseData(null, "success", [], "Вопрос успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
