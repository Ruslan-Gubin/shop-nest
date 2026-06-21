import {
  Query,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
} from "@nestjs/common";
import { CartDiscountsService } from "./cart-discounts.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { CartDiscount } from "./entities/cart-discount.entity";
import { CreateCartDiscountDto } from "./dto/create-cart-discount.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("cart-discounts")
export class CartDiscountsController {
  constructor(private readonly cartDiscountsService: CartDiscountsService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createCartDiscountDto: CreateCartDiscountDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<CartDiscount | null>> {
    try {
      const cartDiscount = await this.cartDiscountsService.create({
        ...createCartDiscountDto,
        created_user_id: user.sub,
      });

      return responseData(cartDiscount, "success", [], "Скидка на корзину успешно добавлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("")
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{
      cartDiscounts: CartDiscount[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const cartDiscounts = await this.cartDiscountsService.findAll(page, limit, name);
      const totalCount = await this.cartDiscountsService.getTotalCount(name);

      return responseData(
        { cartDiscounts, totalCount, paginationPage: page },
        "success",
        [],
        "Список скидок на корзину получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("active")
  async findActive(
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<CartDiscount[] | null>> {
    try {
      const cartDiscounts = await this.cartDiscountsService.findActive(user.role);

      return responseData(
        cartDiscounts,
        "success",
        [],
        "Список активных скидок на корзину получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<CartDiscount | null>> {
    try {
      const cartDiscount = await this.cartDiscountsService.findOne(Number(id));

      return responseData(cartDiscount, "success", [], "Скидка на корзину получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateCartDiscountDto: CreateCartDiscountDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.cartDiscountsService.update(Number(id), updateCartDiscountDto);

      return responseData(null, "success", [], "Скидка на корзину успешно обновлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.cartDiscountsService.remove(Number(id));

      return responseData(null, "success", [], "Скидка на корзину успешно удалена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
