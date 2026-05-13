import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateProductSpecificationDto } from "./dto/create-product-specification.dto";
import { UpdateProductSpecificationDto } from "./dto/update-product-specification.dto";
import { ProductSpecification } from "./entities/product-specification.entity";

@Injectable()
export class ProductSpecificationService {
  constructor(
    @InjectRepository(ProductSpecification)
    private productSpecificationRepository: Repository<ProductSpecification>,
  ) {}

  async create(createProductSpecificationDto: CreateProductSpecificationDto) {
    return this.productSpecificationRepository
      .save(createProductSpecificationDto)
      .catch((error) => {
        throw `Не удалось добавить значение характеристики товара, ${error.message}`;
      });
  }

  async createMany(items: CreateProductSpecificationDto[]) {
    const entities = items.map((item) => this.productSpecificationRepository.create(item));
    return this.productSpecificationRepository.save(entities).catch((error) => {
      throw `Не удалось добавить значения характеристик товара, ${error.message}`;
    });
  }

  async findAll(productId?: number, specificationId?: number) {
    const whereCondition: { product_id?: number; specification_id?: number } = {};

    if (productId) {
      whereCondition.product_id = productId;
    }

    if (specificationId) {
      whereCondition.specification_id = specificationId;
    }

    return this.productSpecificationRepository.find({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить список значений характеристик товара, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.productSpecificationRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить значение характеристики товара, ${error.message}`;
    });
  }

  async findByProductId(productId: number) {
    return this.productSpecificationRepository
      .find({
        where: { product_id: productId },
        relations: ["specification"],
      })
      .catch((error) => {
        throw `Не удалось получить характеристики товара, ${error.message}`;
      });
  }

  async update(id: number, updateProductSpecificationDto: UpdateProductSpecificationDto) {
    return this.productSpecificationRepository
      .update(id, updateProductSpecificationDto)
      .catch((error) => {
        throw `Не удалось изменить значение характеристики товара, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.productSpecificationRepository.delete(id).catch((error) => {
      throw `Не удалось удалить значение характеристики товара, ${error.message}`;
    });
  }

  async deleteByProductId(productId: number) {
    await this.productSpecificationRepository.delete({ product_id: productId }).catch((error) => {
      throw `Не удалось удалить характеристики товара, ${error.message}`;
    });
  }

  async deleteByProductIdAndSpecificationIds(productId: number, specificationIds: number[]) {
    await this.productSpecificationRepository
      .createQueryBuilder()
      .delete()
      .where("product_id = :productId", { productId })
      .andWhere("specification_id NOT IN (:...specificationIds)", { specificationIds })
      .execute()
      .catch((error) => {
        throw `Не удалось удалить характеристики товара, ${error.message}`;
      });
  }
}

