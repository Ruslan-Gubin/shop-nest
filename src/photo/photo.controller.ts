import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  Query,
} from "@nestjs/common";
import { PhotoService } from "./photo.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Photo } from "./entities/photo.entity";
import { CreatePhotoAndPositionDto } from "./dto/create-photo.dto";
import { UpdatePhotoDto } from "./dto/update-photo.dto";

@Controller("photo")
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createPhotoDto: CreatePhotoAndPositionDto,
  ): Promise<ResponseData<Photo | null>> {
    try {
      const photo = await this.photoService.createAndSetPosition(createPhotoDto);

      return responseData(photo, "success", [], "Фото успешно добавлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("parent_type") parent_type?: string,
    @Query("parent_id") parent_id?: string,
  ): Promise<ResponseData<Photo[] | null>> {
    try {
      const photos = await this.photoService.findAll(
        parent_type,
        parent_id ? Number(parent_id) : undefined,
      );

      return responseData(photos, "success", [], "Список фото получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Photo | null>> {
    try {
      const photo = await this.photoService.findOne(Number(id));

      return responseData(photo, "success", [], "Фото получено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updatePhotoDto: UpdatePhotoDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.photoService.update(Number(id), updatePhotoDto);

      return responseData(null, "success", [], "Фото успешно изменено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.photoService.remove(Number(id));

      return responseData(null, "success", [], "Фото успешно удалено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
