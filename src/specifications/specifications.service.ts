import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, type Repository } from "typeorm";
import { CreateSpecificationDto } from "./dto/create-specification.dto";
import { UpdateSpecificationDto } from "./dto/update-specification.dto";
import { Specification } from "./entities/specification.entity";

@Injectable()
export class SpecificationsService {
  constructor(
    @InjectRepository(Specification)
    private specificationRepository: Repository<Specification>,
  ) {}

  async create(createSpecificationDto: CreateSpecificationDto) {
    return this.specificationRepository.save(createSpecificationDto).catch((error) => {
      throw `Не удалось добавить характеристику, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string, name: string, created_user_id?: number) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.specificationRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список характеристик, ${error.message}`;
      });
  }

  async getTotalCount(name?: string, created_user_id?: number) {
    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.specificationRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество характеристик, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.specificationRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить характеристику, ${error.message}`;
    });
  }

  async update(id: number, updateSpecificationDto: UpdateSpecificationDto) {
    return this.specificationRepository
      .update(id, {
        ...updateSpecificationDto,
      })
      .catch((error) => {
        throw `Не удалось изменить характеристику, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.specificationRepository.delete(id).catch((error) => {
      throw `Не удалось удалить характеристику, ${error.message}`;
    });
  }
}
