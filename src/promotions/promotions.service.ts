import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, LessThanOrEqual, MoreThanOrEqual, Like, type Repository } from "typeorm";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { Promotion } from "./entities/promotion.entity";

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto) {
    const dateFrom = new Date(createPromotionDto.date_from);
    const dateTo = new Date(createPromotionDto.date_to);

    const overlappingPromotions = await this.promotionRepository
      .createQueryBuilder("promotion")
      .where("promotion.date_from <= :dateTo", { dateTo })
      .andWhere("promotion.date_to >= :dateFrom", { dateFrom })
      .getMany();

    if (overlappingPromotions.length > 0) {
      throw "Даты акции перекрываются с существующей активной акцией";
    }

    return this.promotionRepository.save(createPromotionDto).catch((error) => {
      throw `Не удалось добавить акцию, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string, name: string, created_user_id?: number) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.promotionRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { created_at: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список акций, ${error.message}`;
      });
  }

  async getTotalCount(name?: string, created_user_id?: number) {
    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.promotionRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество акций, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.promotionRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить акцию, ${error.message}`;
    });
  }

  async findActive() {
    const now = new Date();
    return this.promotionRepository
      .find({
        where: {
          date_from: LessThanOrEqual(now),
          date_to: MoreThanOrEqual(now),
        },
      })
      .catch((error) => {
        throw `Не удалось получить активные акции, ${error.message}`;
      });
  }

  async update(id: number, updatePromotionDto: UpdatePromotionDto) {
    const dateFrom = updatePromotionDto.date_from ? new Date(updatePromotionDto.date_from) : null;
    const dateTo = updatePromotionDto.date_to ? new Date(updatePromotionDto.date_to) : null;

    if (dateFrom && dateTo) {
      const overlappingPromotions = await this.promotionRepository
        .createQueryBuilder("promotion")
        .where("promotion.id != :id", { id })
        .andWhere("promotion.date_from <= :dateTo", { dateTo })
        .andWhere("promotion.date_to >= :dateFrom", { dateFrom })
        .getMany();

      if (overlappingPromotions.length > 0) {
        throw "Даты акции перекрываются с существующей активной акцией";
      }
    }

    return this.promotionRepository
      .update(id, {
        ...updatePromotionDto,
      })
      .catch((error) => {
        throw `Не удалось изменить акцию, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.promotionRepository.delete(id).catch((error) => {
      throw `Не удалось удалить акцию, ${error.message}`;
    });
  }
}
