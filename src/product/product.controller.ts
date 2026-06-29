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
  ParseArrayPipe,
} from "@nestjs/common";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Product } from "./entities/product.entity";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

@Controller("product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get("filters")
  async getFilters(
    @CurrentUser() user?: CurrentStrategyUser,
    @Query("category_id") category_id?: string,
    @Query("search") search?: string,
  ): Promise<
    ResponseData<{
      price: { min: number; max: number };
      specifications: {
        id: number;
        name: string;
        type: string;
        values: { value: string }[];
      }[];
    } | null>
  > {
    try {
      const start = Date.now();
      const filters = await this.productService.getFilters({
        role: user?.role ?? "user",
        category_id,
        search,
      });

      console.log("filter ms:", Date.now() - start);
      return responseData(filters, "success", [], "Фильтры получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("catalog")
  async getCatalog(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @CurrentUser() user?: CurrentStrategyUser,
    @Query("category_id") category_id?: string,
    @Query("search") search?: string,
    @Query("sort") sort?: string,
    @Query("price_from") price_from?: string,
    @Query("price_to") price_to?: string,
    @Query("specifications") specifications?: string,
  ): Promise<
    ResponseData<{ products: Product[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const start = Date.now();
      const catalog = await this.productService.getCatalog({
        page,
        limit,
        role: user?.role || "user",
        category_id,
        search,
        sort,
        price_from,
        price_to,
        specifications,
      });

      console.log("catalog ms:", Date.now() - start);
      return responseData(catalog, "success", [], "Товары получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("main-page")
  async findForMainPage(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<
    ResponseData<{ products: Product[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const products = await this.productService.findForMainPage(page, limit, user.role);
      const totalCount = await this.productService.getTotalCountForMainPage(user.role);

      return responseData(
        { products, totalCount, paginationPage: page },
        "success",
        [],
        "Товары для главной страницы получены",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("by-ids")
  async findByIds(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Product[] | null>> {
    try {
      const products = await this.productService.findByIds(ids, user.role);

      return responseData(products, "success", [], "Товары получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

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
      await this.productService.incrementView(Number(id));

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
