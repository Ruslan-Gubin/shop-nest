import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from "@nestjs/common";
import { PriceRangeService } from "./price-range.service";
import { ResponseData, responseData } from "src/helpers/response";
import { PriceRange } from "./entities/price-range.entity";
import { CreatePriceRangeDto } from "./dto/create-price-range.dto";

@Controller("price-ranges")
export class PriceRangeController {
  constructor(private readonly priceRangeService: PriceRangeService) {}

  @Post("create")
  async create(@Body() createDto: CreatePriceRangeDto): Promise<ResponseData<PriceRange | null>> {
    try {
      const range = await this.priceRangeService.create(createDto);

      return responseData(range, "success", [], "Диапазон успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("")
  async findAll(@Query("range") range: string): Promise<ResponseData<PriceRange[] | null>> {
    try {
      const rangeNumber = range ? Number(range) : undefined;
      const ranges = await this.priceRangeService.findAll(rangeNumber);

      return responseData(ranges, "success", [], "Список диапазонов получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<PriceRange | null>> {
    try {
      const range = await this.priceRangeService.findOne(Number(id));

      return responseData(range, "success", [], "Диапазон получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: CreatePriceRangeDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.priceRangeService.update(Number(id), updateDto);

      return responseData(null, "success", [], "Диапазон успешно обновлён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.priceRangeService.remove(Number(id));

      return responseData(null, "success", [], "Диапазон успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
