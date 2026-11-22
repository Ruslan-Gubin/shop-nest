import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ProductSourceRecordService } from "./product-source-record.service";
import { CheckImportItemDto } from "./dto/check-import-items.dto";
import { CreateProductFromRecordDto } from "./dto/create-product-from-record.dto";
import { SaveGeneratedRecordDto } from "./dto/save-record.dto";
import { responseData } from "src/helpers/response";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";

@Controller("product-source-record")
export class ProductSourceRecordController {
  constructor(private readonly productSourceRecordService: ProductSourceRecordService) {}

  @Get(":value")
  @Roles("admin", "moderator")
  async getRecordInfo(@Param("value") value: string) {
    try {
      const record = await this.productSourceRecordService.findRecord(value);

      return responseData(record, "success", [], "Запись получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("save-record")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async saveRecord(@Body() payload: SaveGeneratedRecordDto) {
    try {
      const result = await this.productSourceRecordService.saveGeneratedRecord(payload);

      return responseData(result, "success", [], "Запись сгенерированного товара сохранена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("check-import-items")
  async checkImportItems(@Body() items: CheckImportItemDto[]) {
    try {
      const result = await this.productSourceRecordService.checkImportItems(items);

      return responseData(result, "success", [], "Статусы получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("create-product")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async createProductFromRecord(@Body() payload: CreateProductFromRecordDto) {
    try {
      const result = await this.productSourceRecordService.createProductFromRecord(payload);

      return responseData(result, "success", [], "Товар успешно создан из записи");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
