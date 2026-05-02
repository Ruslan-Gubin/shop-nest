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
import { PromotionsService } from "./promotions.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Promotion } from "./entities/promotion.entity";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Promotion | null>> {
    try {
      const promotion = await this.promotionsService.create({
        ...createPromotionDto,
        created_user_id: user.sub,
      });

      return responseData(promotion, "success", [], "Акция успешно добавлена");
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
    ResponseData<{ promotions: Promotion[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const promotions = await this.promotionsService.findAll(page, limit, name);
      const totalCount = await this.promotionsService.getTotalCount(name);

      return responseData(
        { promotions, totalCount, paginationPage: page },
        "success",
        [],
        "Список акций получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("active")
  async findActive(): Promise<ResponseData<Promotion[] | null>> {
    try {
      const promotions = await this.promotionsService.findActive();

      return responseData(promotions, "success", [], "Список активных акций получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Promotion | null>> {
    try {
      const promotion = await this.promotionsService.findOne(Number(id));

      return responseData(promotion, "success", [], "Акция получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updatePromotionDto: CreatePromotionDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.promotionsService.update(Number(id), updatePromotionDto);

      return responseData(null, "success", [], "Акция успешно обновлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.promotionsService.remove(Number(id));

      return responseData(null, "success", [], "Акция успешно удалена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}

