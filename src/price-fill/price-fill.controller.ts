import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from "@nestjs/common";
import { PriceFillService } from "./price-fill.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { PriceFill } from "./entities/price-fill.entity";
import { CreatePriceFillDto } from "./dto/create-price-fill.dto";
import { UpdatePriceFillDto } from "./dto/update-price-fill.dto";

@Controller("price-fill")
export class PriceFillController {
  constructor(private readonly priceFillService: PriceFillService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createPriceFillDto: CreatePriceFillDto,
  ): Promise<ResponseData<PriceFill | null>> {
    try {
      const priceFill = await this.priceFillService.create(createPriceFillDto);

      return responseData(priceFill, "success", [], "Правила автозаполнения успешно добавлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(): Promise<ResponseData<PriceFill[] | null>> {
    try {
      const priceFills = await this.priceFillService.findAll();

      return responseData(priceFills, "success", [], "Список правил автозаполнения получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<PriceFill | null>> {
    try {
      const priceFill = await this.priceFillService.findOne(Number(id));

      return responseData(priceFill, "success", [], "Правила автозаполнения получено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updatePriceFillDto: UpdatePriceFillDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.priceFillService.update(Number(id), updatePriceFillDto);

      return responseData(null, "success", [], "Правила автозаполнения успешно обновлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.priceFillService.remove(Number(id));

      return responseData(null, "success", [], "Правила автозаполнения успешно удалено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
