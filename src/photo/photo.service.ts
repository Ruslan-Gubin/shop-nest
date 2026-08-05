import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { CreatePhotoAndPositionDto, CreatePhotoDto } from "./dto/create-photo.dto";
import { UpdatePhotoDto } from "./dto/update-photo.dto";
import { Photo } from "./entities/photo.entity";

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
  ) {}

  async create(createPhotoDto: CreatePhotoDto) {
    const photo = {
      ...createPhotoDto,
      position: await this.getNextPosition(createPhotoDto.parent_type, createPhotoDto.parent_id),
    };

    return this.photoRepository.save(photo).catch((error) => {
      throw `Не удалось добавить фото, ${error.message}`;
    });
  }

  private async getNextPosition(parentType: string, parentId: number) {
    const count = await this.photoRepository.count({
      where: { parent_type: parentType, parent_id: parentId },
    });

    return count + 1;
  }

  async createAndSetPosition(createPhotoDto: CreatePhotoAndPositionDto) {
    return this.photoRepository.save(createPhotoDto).catch((error) => {
      throw `Не удалось добавить фото, ${error.message}`;
    });
  }

  async findAll(parent_type?: string, parent_id?: number) {
    const whereCondition: { parent_type?: string; parent_id?: number } = {};

    if (parent_type) {
      whereCondition.parent_type = parent_type;
    }

    if (parent_id) {
      whereCondition.parent_id = parent_id;
    }

    return this.photoRepository
      .find({
        where: whereCondition,
        order: { position: "ASC", id: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить список фото, ${error.message}`;
      });
  }

  async findByParent(parentType: string, parentId: number) {
    return this.findAll(parentType, parentId);
  }

  async findForParents(parentType: string, parentIds: number[]) {
    if (parentIds.length === 0) return [];

    return this.photoRepository
      .find({
        where: { parent_type: parentType, parent_id: In(parentIds) },
        order: { position: "ASC", id: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить список фото, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.photoRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить фото, ${error.message}`;
    });
  }

  async update(id: number, updatePhotoDto: UpdatePhotoDto) {
    return this.photoRepository
      .update(id, {
        ...updatePhotoDto,
      })
      .catch((error) => {
        throw `Не удалось изменить фото, ${error.message}`;
      });
  }

  async remove(id: number) {
    const photo = await this.findOne(id);

    if (!photo) return;

    await this.photoRepository.delete(id).catch((error) => {
      throw `Не удалось удалить фото, ${error.message}`;
    });

    // await this.renumber(photo.parent_type, photo.parent_id);
  }

  // private async renumber(parentType: string, parentId: number) {
  //   const photos = await this.photoRepository.find({
  //     where: { parent_type: parentType, parent_id: parentId },
  //     order: { position: "ASC", id: "ASC" },
  //   });
  //
  //   const updated = photos.map((photo, index) => ({ ...photo, position: index + 1 }));
  //
  //   await this.photoRepository.save(updated).catch((error) => {
  //     throw `Не удалось обновить позиции фото, ${error.message}`;
  //   });
  // }

  async deleteByParent(parentType: string, parentId: number) {
    await this.photoRepository
      .delete({ parent_type: parentType, parent_id: parentId })
      .catch((error) => {
        throw `Не удалось удалить фото, ${error.message}`;
      });
  }
}
