import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, Repository } from "typeorm";
import type { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import type { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { Warehouse } from "./entities/warehouse.entity";

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async create(createWarehouseDto: CreateWarehouseDto) {
    if (createWarehouseDto.default_warehouse) {
      await this.clearDefaultWarehouse(createWarehouseDto.create_user_id);
    }

    const totalWarehouses = await this.getTotalCount(createWarehouseDto.create_user_id);

    if (typeof totalWarehouses === "number" && totalWarehouses === 0) {
      createWarehouseDto.default_warehouse = true;
    }

    return this.warehouseRepository.save(createWarehouseDto).catch((error) => {
      throw `Не удалось добавить склад, ${error.message}`;
    });
  }

  async findAll(create_user_id: number, page: string, limit: string, name: string) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string>; create_user_id: number } = {
      create_user_id,
    };

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    return this.warehouseRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список складов, ${error.message}`;
      });
  }

  async getTotalCount(create_user_id: number, name?: string) {
    const whereCondition: { name?: FindOperator<string>; create_user_id: number } = {
      create_user_id,
    };

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    return this.warehouseRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество складов, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.warehouseRepository.findOneBy({ id }).catch((error) => {
      throw `Не удалось получить склад, ${error.message}`;
    });
  }

  async update(id: number, updateWarehouseDto: UpdateWarehouseDto) {
    if (updateWarehouseDto.default_warehouse) {
      const currentWarehouse = await this.findOne(id);

      if (currentWarehouse) {
        await this.clearDefaultWarehouse(currentWarehouse.create_user_id);
      }
    }

    return this.warehouseRepository.update(id, updateWarehouseDto).catch((error) => {
      throw `Не удалось изменить склад, ${error.message}`;
    });
  }

  async remove(id: number) {
    return this.warehouseRepository.delete(id).catch((error) => {
      throw `Не удалось удалить склад, ${error.message}`;
    });
  }

  async findNotDefaultWarehouse(create_user_id: number) {
    return this.warehouseRepository
      .findOneBy({ default_warehouse: false, create_user_id })
      .catch((error) => {
        throw `Не удалось получит склад не по умолчанию, ${error.message}`;
      });
  }

  async updateWarehouseDefault(id: number, create_user_id: number) {
    await this.warehouseRepository
      .update({ id, create_user_id }, { default_warehouse: true })
      .catch((error) => {
        throw `Не удалось обновить склад не по умолчанию, ${error.message}`;
      });
  }

  private async clearDefaultWarehouse(create_user_id: number) {
    await this.warehouseRepository
      .update({ default_warehouse: true, create_user_id }, { default_warehouse: false })
      .catch((error) => {
        throw `Не удалось обновить склад по умолчанию, ${error.message}`;
      });
  }
}
