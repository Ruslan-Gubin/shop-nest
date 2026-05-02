import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { CreatePriceRangeDto } from "./dto/create-price-range.dto";
import { UpdatePriceRangeDto } from "./dto/update-price-range.dto";
import { PriceRange } from "./entities/price-range.entity";

@Injectable()
export class PriceRangeService {
  constructor(
    @InjectRepository(PriceRange)
    private priceRangeRepository: Repository<PriceRange>,
  ) {}

  async create(createDto: CreatePriceRangeDto) {
    if (createDto.price_to < createDto.price_from) {
      throw "Цена 'до' должна быть больше цены 'от'";
    }

    const existingRanges = await this.findAll();

    for (const range of existingRanges) {
      const a = createDto.price_from;
      const b = createDto.price_to;
      const c = range.price_from;
      const d = range.price_to;

      if (a <= d && b >= c) {
        throw `Диапазон пересекается с существующим [${c} - ${d}]`;
      }
    }

    return this.priceRangeRepository.save(createDto).catch((error) => {
      throw `Не удалось добавить диапазон, ${error.message}`;
    });
  }

  async findAll(range?: number) {
    const queryBuilder = this.priceRangeRepository
      .createQueryBuilder("priceRange")
      .orderBy("priceRange.price_from", "ASC");

    if (range !== undefined) {
      queryBuilder.where("priceRange.price_from <= :range AND priceRange.price_to >= :range", {
        range,
      });
    }

    return queryBuilder.getMany().catch((error) => {
      throw `Не удалось получить список диапазонов, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.priceRangeRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить диапазон, ${error.message}`;
    });
  }

  async update(id: number, updateDto: UpdatePriceRangeDto) {
    if (updateDto.price_from !== undefined || updateDto.price_to !== undefined) {
      const existingRanges = await this.findAll();
      const currentRange = existingRanges.find((r) => r.id === id);

      if (currentRange) {
        const newFrom = updateDto.price_from ?? currentRange.price_from;
        const newTo = updateDto.price_to ?? currentRange.price_to;

        for (const range of existingRanges) {
          if (range.id === id) continue;

          const a = newFrom;
          const b = newTo;
          const c = range.price_from;
          const d = range.price_to;

          if (a <= d && b >= c) {
            throw `Диапазон пересекается с существующим [${c} - ${d}]`;
          }
        }
      }
    }

    return this.priceRangeRepository.update(id, updateDto).catch((error) => {
      throw `Не удалось изменить диапазон, ${error.message}`;
    });
  }

  async remove(id: number) {
    await this.priceRangeRepository.delete(id).catch((error) => {
      throw `Не удалось удалить диапазон, ${error.message}`;
    });
  }
}
