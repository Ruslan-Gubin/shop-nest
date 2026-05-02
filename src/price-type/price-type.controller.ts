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
import { PriceTypeService } from "./price-type.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { PriceType } from "./entities/price-type.entity";
import { CreatePriceTypeDto } from "./dto/create-price-type.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("price-type")
export class PriceTypeController {
  constructor(private readonly priceTypeService: PriceTypeService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createPriceTypeDto: CreatePriceTypeDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<PriceType | null>> {
    try {
      const priceType = await this.priceTypeService.create({
        ...createPriceTypeDto,
        created_user_id: user.sub,
      });

      return responseData(priceType, "success", [], "Тип цены успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("types")
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{ priceTypes: PriceType[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const priceTypes = await this.priceTypeService.findAll(page, limit, name);
      const totalCount = await this.priceTypeService.getTotalCount(name);

      return responseData(
        { priceTypes, totalCount, paginationPage: page },
        "success",
        [],
        "Список типов цен получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("price-types/my")
  async findAllMy(
    @CurrentUser() user: CurrentStrategyUser,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{ priceTypes: PriceType[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const priceTypes = await this.priceTypeService.findAll(page, limit, name, user.sub);
      const totalCount = await this.priceTypeService.getTotalCount(name, user.sub);

      return responseData(
        { priceTypes, totalCount, paginationPage: page },
        "success",
        [],
        "Список типов цен получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<PriceType | null>> {
    try {
      const priceType = await this.priceTypeService.findOne(Number(id));

      return responseData(priceType, "success", [], "Тип цены получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updatePriceTypeDto: CreatePriceTypeDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.priceTypeService.update(Number(id), updatePriceTypeDto);

      return responseData(null, "success", [], "Тип цены успешно обновлён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.priceTypeService.remove(Number(id));

      return responseData(null, "success", [], "Тип цены успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
