import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import type { CreateTransferDto } from "./dto/create-transfer.dto";
import type { UpdateTransferDto } from "./dto/update-transfer.dto";
import { Transfer } from "./entities/transfer.entity";

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private readonly transfersRepository: Repository<Transfer>,
  ) {}

  async create(payload: CreateTransferDto) {
    return this.transfersRepository
      .save({
        type: payload.type,
        order_id: payload.order_id,
        from_warehouse: { id: payload.from_warehouse_id },
        to_warehouse: payload.to_warehouse_id ? { id: payload.to_warehouse_id } : undefined,
        to_address: payload.address_id ? { id: payload.address_id } : undefined,
      })
      .catch((error) => {
        throw `Не удалось создать перемещение, ${error.message}`;
      });
  }

  async findAll(
    page: string,
    limit: string,
    status?: "processing" | "completed" | "rejected",
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const where = status ? { status } : {};

    return this.transfersRepository
      .findAndCount({
        skip,
        take: Number(limit),
        where,
        relations: [
          "from_warehouse",
          "from_warehouse.address",
          "to_warehouse",
          "to_warehouse.address",
          "to_address",
        ],
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список перемещений, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.transfersRepository
      .findOne({
        where: { id },
        relations: [
          "from_warehouse",
          "from_warehouse.address",
          "to_warehouse",
          "to_warehouse.address",
          "to_address",
        ],
      })
      .catch((error) => {
        throw `Не удалось получить перемещение, ${error.message}`;
      });
  }

  async update(id: number, updateTransferDto: UpdateTransferDto) {
    return this.transfersRepository.update(id, updateTransferDto).catch((error) => {
      throw `Не удалось изменить перемещение, ${error.message}`;
    });
  }

  async findByOrderId(order_id: number) {
    return this.transfersRepository
      .find({
        where: { order_id, type: "transfer" },
        relations: [
          "from_warehouse",
          "from_warehouse.address",
          "to_warehouse",
          "to_warehouse.address",
          "to_address",
        ],
      })
      .catch((error) => {
        throw `Не удалось получить перемещения заказа, ${error.message}`;
      });
  }

  async findDeliveryByOrderId(order_id: number) {
    return this.transfersRepository
      .find({
        where: { order_id, type: "delivery" },
        relations: ["from_warehouse", "from_warehouse.address", "to_address"],
      })
      .catch((error) => {
        throw `Не удалось получить перемещения доставки заказа, ${error.message}`;
      });
  }

  async updateStatusByOrderAndType(
    order_id: number,
    type: "transfer" | "delivery",
    status: "processing" | "completed" | "rejected",
  ) {
    return this.transfersRepository.update({ order_id, type }, { status }).catch((error) => {
      throw `Не удалось обновить статус перемещений, ${error.message}`;
    });
  }

  async remove(id: number) {
    await this.transfersRepository.delete(id).catch((error) => {
      throw `Не удалось удалить перемещение, ${error.message}`;
    });
  }
}
