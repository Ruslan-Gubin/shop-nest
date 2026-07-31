import { Body, Controller, Post } from "@nestjs/common";
import { ProductSourceRecordService } from "./product-source-record.service";
import { SearchProductSourceRecordDto } from "./dto/product-source-record.dto";
import { CheckImportItemDto } from "./dto/check-import-items.dto";
import { responseData } from "src/helpers/response";

@Controller("product-source-record")
export class ProductSourceRecordController {
  constructor(private readonly productSourceRecordService: ProductSourceRecordService) {}

  @Post()
  async search(@Body() dto: SearchProductSourceRecordDto) {
    try {
      const result = await this.productSourceRecordService.search(dto.name, dto.barcode);

      return responseData(result, "success", [], "Информация о товаре успешно найдена");
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
}
