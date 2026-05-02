import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository, FindOperator } from "typeorm";
import { Like } from "typeorm";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "./entities/product.entity";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    return this.productRepository.save(createProductDto).catch((error) => {
      throw `Не удалось добавить товаров, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string, name: string) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    return this.productRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список товаров, ${error.message}`;
      });
  }

  async getTotalCount(name?: string) {
    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    return this.productRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество товаров, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.productRepository.findOneBy({ id }).catch((error) => {
      throw `Не удалось получить товар, ${error.message}`;
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    return this.productRepository
      .update(id, {
        ...updateProductDto,
      })
      .catch((error) => {
        throw `Не удалось изменить товаров, ${error.message}`;
      });
  }

  async remove(id: number) {
    return this.productRepository.delete(id).catch((error) => {
      throw `Не удалось удалить товаров, ${error.message}`;
    });
  }
}
