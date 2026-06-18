import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from "@nestjs/common";
import { ProductPriceService } from "./product-price.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { ProductPrice } from "./entities/product-price.entity";
import { CreateProductPriceDto } from "./dto/create-product-price.dto";
import { UpdateProductPriceDto } from "./dto/update-product-price.dto";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

@Controller("product-price")
export class ProductPriceController {
  constructor(private readonly productPriceService: ProductPriceService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createProductPriceDto: CreateProductPriceDto,
  ): Promise<ResponseData<ProductPrice | null>> {
    try {
      const productPrice = await this.productPriceService.create(createProductPriceDto);

      return responseData(productPrice, "success", [], "Цена товара успешно добавлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":product_id")
  async findAll(
    @Param("product_id") product_id: string,
  ): Promise<ResponseData<ProductPrice[] | null>> {
    try {
      const productPrices = await this.productPriceService.findAll(product_id);

      return responseData(productPrices, "success", [], "Список цен товаров получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("for-user/:product_id")
  async getProductPricesForUser(
    @Param("product_id") product_id: string,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<{ price: number; minQuantity: number }[] | null>> {
    try {
      const productPrices = await this.productPriceService.getProductPricesForUser(
        user.role,
        product_id,
      );

      return responseData(
        productPrices,
        "success",
        [],
        "Список цен товара для пользователя получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<ProductPrice | null>> {
    try {
      const productPrice = await this.productPriceService.findOne(Number(id));

      return responseData(productPrice, "success", [], "Цена товара получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateProductPriceDto: UpdateProductPriceDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productPriceService.update(Number(id), updateProductPriceDto);

      return responseData(null, "success", [], "Цена товара успешно обновлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productPriceService.remove(Number(id));

      return responseData(null, "success", [], "Цена товара успешно удалена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
