import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, Repository } from "typeorm";
import type { CreateProductStockDto } from "./dto/create-product-stock.dto";
import type { UpdateProductStockDto } from "./dto/update-product-stock.dto";
import { ProductStock } from "./entities/product-stock.entity";

@Injectable()
export class ProductStockService {
  constructor(
    @InjectRepository(ProductStock)
    private productStockRepository: Repository<ProductStock>,
  ) {}

  async create(createProductStockDto: CreateProductStockDto) {
    const available = (createProductStockDto.quantity || 0) - (createProductStockDto.reserved || 0);
    const in_stock = available > 0;

    return this.productStockRepository
      .save({
        ...createProductStockDto,
        available,
        in_stock,
      })
      .catch((error) => {
        throw `Не удалось добавить остатки товара, ${error.message}`;
      });
  }

  async findAll(
    page: string,
    limit: string,
    product_id?: number,
    warehouse_id?: number,
  ) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: {
      product_id?: FindOperator<number>;
      warehouse_id?: FindOperator<number>;
    } = {};

    if (product_id) {
      whereCondition.product_id = product_id as unknown as FindOperator<number>;
    }

    if (warehouse_id) {
      whereCondition.warehouse_id = warehouse_id as unknown as FindOperator<number>;
    }

    return this.productStockRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
        relations: ["warehouse", "product"],
      })
      .catch((error) => {
        throw `Не удалось получить список остатков товаров, ${error.message}`;
      });
  }

  async getTotalCount(product_id?: number, warehouse_id?: number) {
    const whereCondition: {
      product_id?: FindOperator<number>;
      warehouse_id?: FindOperator<number>;
    } = {};

    if (product_id) {
      whereCondition.product_id = product_id as unknown as FindOperator<number>;
    }

    if (warehouse_id) {
      whereCondition.warehouse_id = warehouse_id as unknown as FindOperator<number>;
    }

    return this.productStockRepository
      .count({ where: whereCondition })
      .catch((error) => {
        throw `Не удалось получить общее количество остатков товаров, ${error.message}`;
      });
  }

  async findOne(id: number) {
    return this.productStockRepository
      .findOne({
        where: { id },
        relations: ["warehouse", "product"],
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара, ${error.message}`;
      });
  }

  async findByProductId(product_id: number) {
    return this.productStockRepository
      .find({
        where: { product_id },
        relations: ["warehouse"],
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара по ID продукта, ${error.message}`;
      });
  }

  async findByWarehouseId(warehouse_id: number) {
    return this.productStockRepository
      .find({
        where: { warehouse_id },
        relations: ["product"],
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара по ID склада, ${error.message}`;
      });
  }

  async update(id: number, updateProductStockDto: UpdateProductStockDto) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw "Остатки товара не найдены";
    }

    const quantity = updateProductStockDto.quantity ?? existing.quantity;
    const reserved = updateProductStockDto.reserved ?? existing.reserved;
    const available = quantity - reserved;
    const in_stock = available > 0;

    return this.productStockRepository
      .update(id, {
        ...updateProductStockDto,
        available,
        in_stock,
      })
      .catch((error) => {
        throw `Не удалось обновить остатки товара, ${error.message}`;
      });
  }

  async updateQuantity(id: number, quantity: number) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw "Остатки товара не найдены";
    }

    const available = quantity - existing.reserved;
    const in_stock = available > 0;

    return this.productStockRepository
      .update(id, { quantity, available, in_stock })
      .catch((error) => {
        throw `Не удалось обновить количество остатков товара, ${error.message}`;
      });
  }

  async reserve(id: number, amount: number) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw "Остатки товара не найдены";
    }

    if (existing.available < amount) {
      throw "Недостаточно доступного количества товара";
    }

    const newReserved = existing.reserved + amount;
    const newAvailable = existing.quantity - newReserved;

    return this.productStockRepository
      .update(id, {
        reserved: newReserved,
        available: newAvailable,
        in_stock: newAvailable > 0,
      })
      .catch((error) => {
        throw `Не удалось зарезервировать товар, ${error.message}`;
      });
  }

  async unreserve(id: number, amount: number) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw "Остатки товара не найдены";
    }

    if (existing.reserved < amount) {
      throw "Невозможно снять с резерва больше, чем зарезервировано";
    }

    const newReserved = existing.reserved - amount;
    const newAvailable = existing.quantity - newReserved;

    return this.productStockRepository
      .update(id, {
        reserved: newReserved,
        available: newAvailable,
        in_stock: newAvailable > 0,
      })
      .catch((error) => {
        throw `Не удалось снять резерв с товара, ${error.message}`;
      });
  }

  async remove(id: number) {
    return this.productStockRepository.delete(id).catch((error) => {
      throw `Не удалось удалить остатки товара, ${error.message}`;
    });
  }
}