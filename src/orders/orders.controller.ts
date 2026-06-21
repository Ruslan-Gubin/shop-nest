import { Controller, Get, Post, Body, Patch, Param, Query, Delete } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { ResponseData, responseData } from "src/helpers/response";
import { Order } from "./entities/order.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("create")
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<any | null>> {
    try {
      const order = await this.ordersService.create({
        ...createOrderDto,
        create_user_id: user.sub,
        user_role: user.role,
      });

      return responseData(order, "success", [], "Заказ успешно создан");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
  ): Promise<
    ResponseData<{
      orders: Order[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const orders = await this.ordersService.findAll(page, limit);
      const totalCount = await this.ordersService.getTotalCount();

      return responseData(
        { orders, totalCount, paginationPage: page },
        "success",
        [],
        "Список заказов получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Order | null>> {
    try {
      const order = await this.ordersService.findOne(Number(id));

      return responseData(order, "success", [], "Заказ получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.ordersService.update(Number(id), updateOrderDto);

      return responseData(null, "success", [], "Заказ успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.ordersService.delete(Number(id));

      return responseData(null, "success", [], "Заказ успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
