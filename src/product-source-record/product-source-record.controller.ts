import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ProductSourceRecordService } from "./product-source-record.service";
import { PickImagesDto } from "./dto/pick-images.dto";
import { GenerateSeoDto } from "./dto/generate-seo.dto";
import { SearchProductSourceRecordDto } from "./dto/product-source-record.dto";
import { CheckImportItemDto } from "./dto/check-import-items.dto";
import { CreateProductFromRecordDto } from "./dto/create-product-from-record.dto";
import { responseData } from "src/helpers/response";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";

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

  @Get("pick-images")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async pickImages(@Query() dto: PickImagesDto) {
    try {
      const images = await this.productSourceRecordService.pickImages(dto.query);

      return responseData(images, "success", [], "Изображения подобраны");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("generate-seo")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async generateSeo(@Body() dto: GenerateSeoDto) {
    try {
      const seo = await this.productSourceRecordService.generateSeo(dto);

      return responseData(seo, "success", [], "SEO-поля сгенерированы");
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
  async createProductFromRecord(@Body() dto: CreateProductFromRecordDto) {
    try {
      const result = await this.productSourceRecordService.createProductFromRecord(dto);

      return responseData(result, "success", [], "Товар успешно создан из записи");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
