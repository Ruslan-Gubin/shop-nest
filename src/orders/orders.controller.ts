import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { ShipOrderDto } from "./dto/ship-order.dto";
import { RejectOrderDto } from "./dto/reject-order.dto";
import { ResponseData, responseData } from "src/helpers/response";
import { Order } from "./entities/order.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";

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
    @Query("order_number") order_number?: string,
    @Query("status") status?: string,
  ): Promise<
    ResponseData<{
      orders: Order[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const [orders, totalCount] = await this.ordersService.findAll(
        page,
        limit,
        order_number,
        status,
      );

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

  @Get("stats")
  async getStats(): Promise<
    ResponseData<{
      total: number;
      totalCart: number;
      totalCash: number;
      averageCheck: number;
      ordersCount: number;
      discount: number;
    } | null>
  > {
    try {
      const stats = await this.ordersService.getStats();

      return responseData(stats, "success", [], "Статистика получена");
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

  @Post("ship")
  async ship(@Body() shipOrderDto: ShipOrderDto): Promise<ResponseData<null>> {
    try {
      await this.ordersService.ship(shipOrderDto);

      return responseData(null, "success", [], "Перемещение для заказа успешно сформированы");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("change-status/:id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async changeStatus(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.ordersService.changeStatus(Number(id));

      return responseData(null, "success", [], "Статус заказа изменён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("reject/:id")
  async rejectOrder(
    @Param("id") id: string,
    @Body() payload: RejectOrderDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<null>> {
    try {
      await this.ordersService.rejectOrder(
        Number(id),
        payload.rejected_reason,
        user.sub,
        user.role,
      );

      return responseData(null, "success", [], "Заказ отменён");
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
