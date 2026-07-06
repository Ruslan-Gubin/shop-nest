import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ProductReviewService } from "./product-review.service";
import { CreateProductReviewDto } from "./dto/create-product-review.dto";
import { UpdateProductReviewDto } from "./dto/update-product-review.dto";
import { AnswerProductReviewDto } from "./dto/answer-product-review.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { ProductReview } from "./entities/product-review.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("product-review")
export class ProductReviewController {
  constructor(private readonly productReviewService: ProductReviewService) {}

  @Post("create")
  async create(
    @Body() createDto: CreateProductReviewDto,
    @CurrentUser() user?: CurrentStrategyUser,
  ): Promise<ResponseData<ProductReview | null>> {
    try {
      if (user) {
        Object.assign(createDto, { create_user_id: user.sub });
      }

      const review = await this.productReviewService.create(createDto);

      return responseData(review, "success", [], "Отзыв успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product/:product_id")
  async findByProductId(
    @Param("product_id") product_id: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
  ): Promise<
    ResponseData<{
      reviews: ProductReview[];
      totalCount: number;
      paginationPage: number;
    } | null>
  > {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const pageNum = page ? parseInt(page, 10) : 1;

      const [reviews, totalCount] = await this.productReviewService.findByProductId(
        Number(product_id),
        pageNum,
        limitNum,
      );

      return responseData(
        { reviews, totalCount, paginationPage: pageNum },
        "success",
        [],
        "Отзывы товара получены",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("my/:product_id")
  async getMyReview(
    @Param("product_id") product_id: string,
    @CurrentUser() user?: CurrentStrategyUser,
  ): Promise<ResponseData<ProductReview | null>> {
    try {
      const review = await this.productReviewService.findMyReview(
        Number(product_id),
        Number(user?.sub),
      );

      return responseData(review, "success", [], review ? "Отзыв получен" : "Отзыв не найден");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("can-review/:product_id")
  async canReview(
    @Param("product_id") product_id: string,
    @CurrentUser() user?: CurrentStrategyUser,
  ): Promise<ResponseData<boolean | null>> {
    try {
      const canReview = await this.productReviewService.canReview(
        Number(product_id),
        Number(user?.sub),
      );

      return responseData(canReview, "success", [], "");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("all")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async getAll(
    @Query("limit") limit?: string,
    @Query("page") page?: string,
  ): Promise<
    ResponseData<{
      reviews: ProductReview[];
      totalCount: number;
      paginationPage: number;
    } | null>
  > {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const pageNum = page ? parseInt(page, 10) : 1;

      const [reviews, totalCount] = await this.productReviewService.findAll(pageNum, limitNum);

      return responseData(
        { reviews, totalCount, paginationPage: pageNum },
        "success",
        [],
        "Все отзывы получены",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<ProductReview | null>> {
    try {
      const review = await this.productReviewService.findOne(Number(id));

      return responseData(review, "success", [], "Отзыв получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("answer/:id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async answer(
    @Param("id") id: string,
    @Body() answerDto: AnswerProductReviewDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productReviewService.answerReview(Number(id), answerDto.answer);

      return responseData(null, "success", [], "Ответ на отзыв успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateProductReviewDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productReviewService.update(Number(id), updateDto);

      return responseData(null, "success", [], "Отзыв успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productReviewService.remove(Number(id));

      return responseData(null, "success", [], "Отзыв успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
