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
import { ProductStockService } from "./product-stock.service";
import { CreateProductStockDto } from "./dto/create-product-stock.dto";
import { UpdateProductStockDto } from "./dto/update-product-stock.dto";
import { CheckingBalancesItemDto } from "./dto/checking-balances.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { ProductStock } from "./entities/product-stock.entity";

@Controller("product-stock")
export class ProductStockController {
  constructor(private readonly productStockService: ProductStockService) {}

  @Post("create")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async create(
    @Body() createProductStockDto: CreateProductStockDto,
  ): Promise<ResponseData<ProductStock | null>> {
    try {
      const productStock = await this.productStockService.create(createProductStockDto);

      return responseData(productStock, "success", [], "Остатки товара успешно добавлены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("checking-balances")
  async checkingBalances(
    @Body() items: CheckingBalancesItemDto[],
  ): Promise<ResponseData<{ product_id: number; available: number }[] | null>> {
    try {
      const stocksAvailability = await this.productStockService.checkStockAvailability(items);

      return responseData(stocksAvailability, "success", [], "Получена проверка остатков");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product-available/:product_id")
  async getProductAvailable(
    @Param("product_id") product_id: string,
  ): Promise<ResponseData<{ available: number; accounting: boolean } | null>> {
    try {
      const stockAvailable = await this.productStockService.getProductAvailable(Number(product_id));

      return responseData(
        stockAvailable,
        "success",
        [],
        "Получено максимальное количество остатков для товара",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("products-available")
  async getManyProductsAvailable(
    @Body() products: number[],
  ): Promise<ResponseData<Record<string, { available: number; accounting: boolean }> | null>> {
    try {
      const stocks = await this.productStockService.getManyProductAvailable(products);

      return responseData(stocks, "success", [], "Получены остатки для списка товаров");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("product_id") product_id: string,
    @Query("warehouse_id") warehouse_id: string,
  ): Promise<
    ResponseData<{
      stocks: ProductStock[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const stocks = await this.productStockService.findAll(
        page,
        limit,
        product_id ? Number(product_id) : undefined,
        warehouse_id ? Number(warehouse_id) : undefined,
      );
      const totalCount = await this.productStockService.getTotalCount(
        product_id ? Number(product_id) : undefined,
        warehouse_id ? Number(warehouse_id) : undefined,
      );

      return responseData(
        { stocks, totalCount, paginationPage: page },
        "success",
        [],
        "Список остатков товаров получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product/:productId")
  async findByProductId(
    @Param("productId") productId: string,
  ): Promise<ResponseData<ProductStock[] | null>> {
    try {
      const stocks = await this.productStockService.findByProductId(Number(productId));

      return responseData(stocks, "success", [], "Остатки товара получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("warehouse/:warehouseId")
  async findByWarehouseId(
    @Param("warehouseId") warehouseId: string,
  ): Promise<ResponseData<ProductStock[] | null>> {
    try {
      const stocks = await this.productStockService.findByWarehouseId(Number(warehouseId));

      return responseData(stocks, "success", [], "Остатки товара на складе получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<ProductStock | null>> {
    try {
      const stock = await this.productStockService.findOne(Number(id));

      return responseData(stock, "success", [], "Остатки товара получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateProductStockDto: UpdateProductStockDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productStockService.update(Number(id), updateProductStockDto);

      return responseData(null, "success", [], "Остатки товара успешно изменены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id/quantity")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async updateQuantity(
    @Param("id") id: string,
    @Body("quantity") quantity: number,
  ): Promise<ResponseData<null>> {
    try {
      await this.productStockService.updateQuantity(Number(id), quantity);

      return responseData(null, "success", [], "Количество остатков товара успешно обновлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id/reserve")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async reserve(
    @Param("id") id: string,
    @Body("amount") amount: number,
  ): Promise<ResponseData<null>> {
    try {
      await this.productStockService.reserve(Number(id), amount);

      return responseData(null, "success", [], "Товар успешно зарезервирован");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id/unreserve")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async unreserve(
    @Param("id") id: string,
    @Body("amount") amount: number,
  ): Promise<ResponseData<null>> {
    try {
      await this.productStockService.unreserve(Number(id), amount);

      return responseData(null, "success", [], "Резерв с товара успешно снят");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productStockService.remove(Number(id));

      return responseData(null, "success", [], "Остатки товара успешно удалены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
