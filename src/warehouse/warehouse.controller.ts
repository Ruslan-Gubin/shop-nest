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
import { WarehouseService } from "./warehouse.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Warehouse } from "./entities/warehouse.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("warehouses")
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post("create")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async create(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Warehouse | null>> {
    try {
      const warehouse = await this.warehouseService.create({
        ...createWarehouseDto,
        create_user_id: user.sub,
      });

      return responseData(warehouse, "success", [], "Склад успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<
    ResponseData<{
      warehouses: Warehouse[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const warehouses = await this.warehouseService.findAll(user.sub, page, limit, name);
      const totalCount = await this.warehouseService.getTotalCount(user.sub, name);

      return responseData(
        { warehouses, totalCount, paginationPage: page },
        "success",
        [],
        "Список складов получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Warehouse | null>> {
    try {
      const warehouse = await this.warehouseService.findOne(Number(id));

      return responseData(warehouse, "success", [], "Склад получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.warehouseService.update(Number(id), updateWarehouseDto);

      return responseData(null, "success", [], "Склад успешно изменён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      const warehouse = await this.warehouseService.findOne(Number(id));

      await this.warehouseService.remove(Number(id));

      if (warehouse && warehouse.default_warehouse) {
        const updateWarehouse = await this.warehouseService.findNotDefaultWarehouse(
          warehouse.create_user_id,
        );
        if (updateWarehouse) {
          await this.warehouseService.updateWarehouseDefault(
            updateWarehouse.id,
            warehouse.create_user_id,
          );
        }
      }

      return responseData(null, "success", [], "Склад успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}

