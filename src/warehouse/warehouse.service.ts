import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, Repository } from "typeorm";
import type { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import type { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { Warehouse } from "./entities/warehouse.entity";
import { AddressService } from "src/address/address.service";

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    private readonly addressRepository: AddressService,
  ) {}

  async findPublic() {
    return this.warehouseRepository
      .find({
        where: { is_active: true, is_public: true },
        relations: ["address"],
      })
      .catch((error) => {
        throw `Не удалось получить склад, ${error.message}`;
      });
  }

  async create(payload: CreateWarehouseDto) {
    if (payload.default_warehouse) {
      await this.clearDefaultWarehouse(payload.create_user_id);
    }

    const totalWarehouses = await this.getTotalCount(payload.create_user_id);

    if (typeof totalWarehouses === "number" && totalWarehouses === 0) {
      payload.default_warehouse = true;
    }

    return this.warehouseRepository
      .save({
        name: payload.name,
        is_active: payload.is_active,
        is_public: payload.is_public,
        create_user_id: payload.create_user_id || 0,
        default_warehouse: payload.default_warehouse,
        description: payload.description,
        address: {
          entrance: payload.entrance,
          flat: payload.flat,
          floor: payload.floor,
          intercom: payload.intercom,
          name: payload.address_name,
          place: payload.place,
          lng: payload.lng,
          lat: payload.lat,
          type: "pickup",
        },
      })
      .catch((error) => {
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
        relations: ["address"],
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
    return this.warehouseRepository
      .findOne({ where: { id }, relations: ["address"] })
      .catch((error) => {
        throw `Не удалось получить склад, ${error.message}`;
      });
  }

  async findDefault() {
    return this.warehouseRepository
      .findOne({
        where: { default_warehouse: true },
        relations: ["address"],
      })
      .catch((error) => {
        throw `Не удалось получить склад по умолчанию, ${error.message}`;
      });
  }

  async update(id: number, payload: UpdateWarehouseDto) {
    const warehouse = await this.findOne(id);

    if (payload.default_warehouse && warehouse?.create_user_id) {
      await this.clearDefaultWarehouse(warehouse.create_user_id);
    }

    if (warehouse && warehouse.address) {
      await this.addressRepository.update(warehouse?.address.id, {
        name: payload.address_name,
        place: payload.place,
        entrance: payload.entrance,
        flat: payload.flat,
        floor: payload.floor,
        intercom: payload.intercom,
        lng: payload.lng,
        lat: payload.lat,
      });
    }

    return this.warehouseRepository
      .update(id, {
        name: payload.name,
        is_active: payload.is_active,
        is_public: payload.is_public,
        default_warehouse: payload.default_warehouse,
        description: payload.description,
      })
      .catch((error) => {
        throw `Не удалось изменить склад, ${error.message}`;
      });
  }

  async remove(id: number) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id },
      relations: ["address"],
    });

    await this.warehouseRepository.delete(id).catch((error) => {
      throw `Не удалось удалить склад, ${error.message}`;
    });

    if (warehouse?.address?.id) {
      await this.addressRepository.remove(warehouse.address.id);
    }

    return null;
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
