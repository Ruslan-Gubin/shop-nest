import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, type Repository } from "typeorm";
import { CreatePriceTypeDto } from "./dto/create-price-type.dto";
import { UpdatePriceTypeDto } from "./dto/update-price-type.dto";
import { PriceType } from "./entities/price-type.entity";

@Injectable()
export class PriceTypeService {
  constructor(
    @InjectRepository(PriceType)
    private priceTypeRepository: Repository<PriceType>,
  ) {}

  async create(createPriceTypeDto: CreatePriceTypeDto) {
    return this.priceTypeRepository.save(createPriceTypeDto).catch((error) => {
      throw `Не удалось добавить тип цены, ${error.message}`;
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

    return this.priceTypeRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список типов цен, ${error.message}`;
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

    return this.priceTypeRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество типов цен, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.priceTypeRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить тип цены, ${error.message}`;
    });
  }

  async update(id: number, updatePriceTypeDto: UpdatePriceTypeDto) {
    return this.priceTypeRepository
      .update(id, {
        ...updatePriceTypeDto,
      })
      .catch((error) => {
        throw `Не удалось изменить тип цены, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.priceTypeRepository.delete(id).catch((error) => {
      throw `Не удалось удалить тип цены, ${error.message}`;
    });
  }
}
