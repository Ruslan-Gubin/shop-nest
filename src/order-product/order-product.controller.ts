import { Controller, Get, Body, Param, Delete, Patch, UseGuards } from "@nestjs/common";
import { OrderProductService } from "./order-product.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { OrderProduct } from "./entities/order-product.entity";
import { UpdateOrderProductDto } from "./dto/update-order-product.dto";

@Controller("order-product")
export class OrderProductController {
  constructor(private readonly orderProductService: OrderProductService) {}

  @Get("order/:order_id")
  async findAll(@Param("order_id") order_id: string): Promise<ResponseData<OrderProduct[] | null>> {
    try {
      const id =
        typeof Number(order_id) === "number" && !Number.isNaN(Number(order_id))
          ? Number(order_id)
          : 0;
      const orderProducts = await this.orderProductService.findAll(id);

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
