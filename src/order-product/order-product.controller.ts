import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from "@nestjs/common";
import { OrderProductService } from "./order-product.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { OrderProduct } from "./entities/order-product.entity";
import { CreateOrderProductDto } from "./dto/create-order-product.dto";
import { UpdateOrderProductDto } from "./dto/update-order-product.dto";

@Controller("order-product")
export class OrderProductController {
  constructor(private readonly orderProductService: OrderProductService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createOrderProductDto: CreateOrderProductDto,
  ): Promise<ResponseData<OrderProduct | null>> {
    try {
      const orderProduct = await this.orderProductService.create(createOrderProductDto);

      return responseData(orderProduct, "success", [], "Товар успешно добавлен в заказ");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("order/:order_id")
  async findAll(
    @Param("order_id") order_id: string,
  ): Promise<ResponseData<OrderProduct[] | null>> {
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