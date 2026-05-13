import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProductSpecificationService } from "./product-specification.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { ProductSpecification } from "./entities/product-specification.entity";
import { CreateProductSpecificationDto } from "./dto/create-product-specification.dto";
import { UpdateProductSpecificationDto } from "./dto/update-product-specification.dto";

@Controller("product-specifications")
export class ProductSpecificationController {
  constructor(private readonly productSpecificationService: ProductSpecificationService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createProductSpecificationDto: CreateProductSpecificationDto,
  ): Promise<ResponseData<ProductSpecification | null>> {
    try {
      const productSpecification = await this.productSpecificationService.create(createProductSpecificationDto);

      return responseData(productSpecification, "success", [], "Значение характеристики товара успешно добавлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("create-many")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async createMany(
    @Body() items: CreateProductSpecificationDto[],
  ): Promise<ResponseData<ProductSpecification[] | null>> {
    try {
      const productSpecifications = await this.productSpecificationService.createMany(items);

      return responseData(productSpecifications, "success", [], "Значения характеристик товара успешно добавлены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("productId") productId: string,
    @Query("specificationId") specificationId: string,
  ): Promise<ResponseData<ProductSpecification[] | null>> {
    try {
      const specifications = await this.productSpecificationService.findAll(
        productId ? Number(productId) : undefined,
        specificationId ? Number(specificationId) : undefined,
      );

      return responseData(specifications, "success", [], "Список значений характеристик товара получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("product/:productId")
  async findByProductId(
    @Param("productId") productId: string,
  ): Promise<ResponseData<ProductSpecification[] | null>> {
    try {
      const specifications = await this.productSpecificationService.findByProductId(Number(productId));

      return responseData(specifications, "success", [], "Характеристики товара получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<ProductSpecification | null>> {
    try {
      const specification = await this.productSpecificationService.findOne(Number(id));

      return responseData(specification, "success", [], "Значение характеристики товара получено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateProductSpecificationDto: UpdateProductSpecificationDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.productSpecificationService.update(Number(id), updateProductSpecificationDto);

      return responseData(null, "success", [], "Значение характеристики товара успешно обновлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.productSpecificationService.remove(Number(id));

      return responseData(null, "success", [], "Значение характеристики товара успешно удалено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete("product/:productId")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async removeByProductId(@Param("productId") productId: string): Promise<ResponseData<null>> {
    try {
      await this.productSpecificationService.deleteByProductId(Number(productId));

      return responseData(null, "success", [], "Характеристики товара успешно удалены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}