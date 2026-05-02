import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { CreatePriceFillDto } from "./dto/create-price-fill.dto";
import { UpdatePriceFillDto } from "./dto/update-price-fill.dto";
import { PriceFill } from "./entities/price-fill.entity";

@Injectable()
export class PriceFillService {
  constructor(
    @InjectRepository(PriceFill)
    private priceFillRepository: Repository<PriceFill>,
  ) {}

  async create(createPriceFillDto: CreatePriceFillDto) {
    return this.priceFillRepository.save(createPriceFillDto).catch((error) => {
      throw `Не удалось добавить правило автозаполнения, ${error.message}`;
    });
  }

  async findAll() {
    return this.priceFillRepository
      .find({
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список правил автозаполнения, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.priceFillRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить правило автозаполнения, ${error.message}`;
      });
  }

  async update(id: number, updatePriceFillDto: UpdatePriceFillDto) {
    return this.priceFillRepository
      .update(id, {
        ...updatePriceFillDto,
      })
      .catch((error) => {
        throw `Не удалось изменить правило автозаполнения, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.priceFillRepository.delete(id).catch((error) => {
      throw `Не удалось удалить правило автозаполнения, ${error.message}`;
    });
  }
}

