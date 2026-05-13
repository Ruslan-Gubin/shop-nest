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
import { SpecificationsService } from "./specifications.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Specification } from "./entities/specification.entity";
import { CreateSpecificationDto } from "./dto/create-specification.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("specifications")
export class SpecificationsController {
  constructor(private readonly specificationsService: SpecificationsService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createSpecificationDto: CreateSpecificationDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Specification | null>> {
    try {
      const specification = await this.specificationsService.create({
        ...createSpecificationDto,
        created_user_id: user.sub,
      });

      return responseData(specification, "success", [], "Характеристика успешно добавлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{ specifications: Specification[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const specifications = await this.specificationsService.findAll(page, limit, name);
      const totalCount = await this.specificationsService.getTotalCount(name);

      return responseData(
        { specifications, totalCount, paginationPage: page },
        "success",
        [],
        "Список характеристик получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("my")
  async findAllMy(
    @CurrentUser() user: CurrentStrategyUser,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{ specifications: Specification[]; totalCount: number; paginationPage: string } | null>
  > {
    try {
      const specifications = await this.specificationsService.findAll(page, limit, name, user.sub);
      const totalCount = await this.specificationsService.getTotalCount(name, user.sub);

      return responseData(
        { specifications, totalCount, paginationPage: page },
        "success",
        [],
        "Список характеристик получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Specification | null>> {
    try {
      const specification = await this.specificationsService.findOne(Number(id));

      return responseData(specification, "success", [], "Характеристика получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateSpecificationDto: CreateSpecificationDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.specificationsService.update(Number(id), updateSpecificationDto);

      return responseData(null, "success", [], "Характеристика успешно обновлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.specificationsService.remove(Number(id));

      return responseData(null, "success", [], "Характеристика успешно удалена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
