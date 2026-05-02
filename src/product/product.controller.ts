import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Product } from "./entities/product.entity";

@Controller("product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(@Body() createProductDto: CreateProductDto): Promise<ResponseData<Product | null>> {
    try {
      const product = await this.productService.create(createProductDto);

      return responseData(product, "success", [], "Товар успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("products")
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{
      products: Product[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const products = await this.productService.findAll(page, limit, name);
      const totalCount = await this.productService.getTotalCount(name);

      return responseData(
        { products, totalCount, paginationPage: page },
        "success",
        [],
        "Список товаров получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Product | null>> {
    try {
      const product = await this.productService.findOne(Number(id));

      return responseData(product, "success", [], "Товар получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productService.update(Number(id), updateProductDto);

      return responseData(null, "success", [], "Товар успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productService.remove(Number(id));

      return responseData(null, "success", [], "Товар успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
