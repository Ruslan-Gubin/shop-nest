import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from "@nestjs/common";
import { OrderProductService } from "./order-product.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { OrderProduct } from "./entities/order-product.entity";
import { OrderProductDto } from "./dto/create-order-product.dto";
import { UpdateOrderProductDto } from "./dto/update-order-product.dto";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { ProductService } from "src/product/product.service";
import { ProductPriceService } from "src/product-price/product-price.service";

@Controller("order-product")
export class OrderProductController {
  constructor(
    private readonly orderProductService: OrderProductService,
    private readonly productService: ProductService,
    private readonly productPriceService: ProductPriceService,
  ) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() orderProductDto: OrderProductDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<OrderProduct | null>> {
    try {
      const product = await this.productService.findOne(orderProductDto.product_id);

      if (!product) {
        throw "Не удалось получить товар";
      }

      const price = await this.productPriceService.getCurrentPrice(
        orderProductDto.product_id,
        orderProductDto.quantity,
        user.role,
      );

      if (price === 0) {
        throw "Не удалось получить цену товара для пользователя";
      }

      const orderProduct = await this.orderProductService.create({
        ...product,
        price,
        product_id: orderProductDto.product_id,
        quantity: orderProductDto.quantity,
        order_id: orderProductDto.order_id,
      });

      return responseData(orderProduct, "success", [], "Товар успешно добавлен в заказ");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("order/:order_id")
  async findAll(@Param("order_id") order_id: string): Promise<ResponseData<OrderProduct[] | null>> {
    try {
      const orderProducts = await this.orderProductService.findAll(order_id);

      return responseData(orderProducts, "success", [], "Список товаров заказа получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<OrderProduct | null>> {
    try {
      const orderProduct = await this.orderProductService.findOne(Number(id));

      return responseData(orderProduct, "success", [], "Товар заказа получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateOrderProductDto: UpdateOrderProductDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.orderProductService.update(Number(id), updateOrderProductDto);

      return responseData(null, "success", [], "Товар заказа успешно обновлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.orderProductService.remove(Number(id));

      return responseData(null, "success", [], "Товар заказа успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
