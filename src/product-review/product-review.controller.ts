import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ProductReviewService } from "./product-review.service";
import { CreateProductReviewDto } from "./dto/create-product-review.dto";
import { UpdateProductReviewDto } from "./dto/update-product-review.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { ProductReview } from "./entities/product-review.entity";

@Controller("product-review")
export class ProductReviewController {
  constructor(private readonly productReviewService: ProductReviewService) {}

  @Post("create")
  async create(
    @Body() createProductReviewDto: CreateProductReviewDto,
  ): Promise<ResponseData<ProductReview | null>> {
    try {
      const review = await this.productReviewService.create(createProductReviewDto);

      return responseData(review, "success", [], "Отзыв успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product/:productId")
  async findByProductId(
    @Param("productId") productId: string,
  ): Promise<ResponseData<ProductReview[] | null>> {
    try {
      const reviews = await this.productReviewService.findByProductId(Number(productId));

      return responseData(reviews, "success", [], "Отзывы товара получены");
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

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateProductReviewDto: UpdateProductReviewDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productReviewService.update(Number(id), updateProductReviewDto);

      return responseData(null, "success", [], "Отзыв успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin", "moderator")
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
