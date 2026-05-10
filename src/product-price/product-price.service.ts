import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { CreateProductPriceDto } from "./dto/create-product-price.dto";
import { UpdateProductPriceDto } from "./dto/update-product-price.dto";
import { ProductPrice } from "./entities/product-price.entity";

@Injectable()
export class ProductPriceService {
  constructor(
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
  ) {}

  async create(createProductPriceDto: CreateProductPriceDto) {
    return this.productPriceRepository.save(createProductPriceDto).catch((error) => {
      throw `Не удалось добавить цену товара, ${error.message}`;
    });
  }

  async findAll(product_id: string) {
    return this.productPriceRepository
      .find({
        order: { id: "DESC" },
        where: { product_id: Number(product_id) },
      })
      .catch((error) => {
        throw `Не удалось получить список цен товаров, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.productPriceRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить цену товара, ${error.message}`;
      });
  }

  async update(id: number, updateProductPriceDto: UpdateProductPriceDto) {
    return this.productPriceRepository
      .update(id, {
        ...updateProductPriceDto,
      })
      .catch((error) => {
        throw `Не удалось изменить цену товара, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.productPriceRepository.delete(id).catch((error) => {
      throw `Не удалось удалить цену товара, ${error.message}`;
    });
  }
}
