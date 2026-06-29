import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import type { CreateAddressDto } from "./dto/create-address.dto";
import type { UpdateAddressDto } from "./dto/update-address.dto";
import { Address } from "./entities/address.entity";

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async create(createAddressDto: CreateAddressDto) {
    return this.addressRepository.save(createAddressDto).catch((error) => {
      throw `Не удалось добавить адрес, ${error.message}`;
    });
  }

  async findAll() {
    return this.addressRepository.find().catch((error) => {
      throw `Не удалось получить список адресов, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.addressRepository.findOneBy({ id }).catch((error) => {
      throw `Не удалось получить адрес, ${error.message}`;
    });
  }

  async findByOrder(order_id: number) {
    return this.addressRepository
      .find({
        //@ts-ignore TODO CHANGE
        where: { order_id },
      })
      .catch((error) => {
        throw `Не удалось получить адреса заказа, ${error.message}`;
      });
  }

  async findByWarehouse(warehouse_id: number) {
    return this.addressRepository
      .find({
        //@ts-ignore TODO CHANGE
        where: { warehouse_id },
      })
      .catch((error) => {
        throw `Не удалось получить адреса склада, ${error.message}`;
      });
  }

  async update(id: number, updateAddressDto: UpdateAddressDto) {
    return this.addressRepository.update(id, updateAddressDto).catch((error) => {
      throw `Не удалось изменить адрес, ${error.message}`;
    });
  }

  async remove(id: number) {
    return this.addressRepository.delete(id).catch((error) => {
      throw `Не удалось удалить адрес, ${error.message}`;
    });
  }
}
