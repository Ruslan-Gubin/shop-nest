import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, Repository } from "typeorm";
import type { CreateProductStockDto } from "./dto/create-product-stock.dto";
import type { UpdateProductStockDto } from "./dto/update-product-stock.dto";
import { ProductStock } from "./entities/product-stock.entity";
import { CheckingBalancesItemDto } from "./dto/checking-balances.dto";
import { Product } from "src/product/entities/product.entity";
import { Warehouse } from "src/warehouse/entities/warehouse.entity";
import { OrderProduct } from "src/order-product/entities/order-product.entity";
import { haversine } from "src/helpers/haversine";

@Injectable()
export class ProductStockService {
  constructor(
    @InjectRepository(ProductStock)
    private productStockRepository: Repository<ProductStock>,
  ) {}

  async reservedProductsForOrder(
    product_id: number,
    quantity: number,
    lng: number | undefined,
    lat: number | undefined,
  ) {
    const stocks = await this.findByFromReservedOrder(product_id);

    if (typeof lng === "number" && typeof lat === "number") {
      stocks.sort((a, b) => {
        const distA = haversine(
          lat,
          lng,
          a.warehouse.address?.lat ?? 0,
          a.warehouse.address?.lng ?? 0,
        );
        const distB = haversine(
          lat,
          lng,
          b.warehouse.address?.lat ?? 0,
          b.warehouse.address?.lng ?? 0,
        );
        return distA - distB;
      });
    }

    let needQuantity = quantity;
    const reservations: { stock_id: number; warehouse_id: number; quantity: number }[] = [];

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      const available = stock ? stock.quantity - stock.reserved : 0;

      if (needQuantity === 0) break;

      if (stock && stock.in_stock) {
        reservations.push({
          stock_id: stock.id,
          warehouse_id: stock.warehouse.id,
          quantity: needQuantity,
        });

        await this.productStockRepository.update(stock.id, {
          reserved: stock.reserved + needQuantity,
        });

        needQuantity = 0;
        break;
      }

      if (stock && needQuantity > 0 && available > 0) {
        if (available >= needQuantity) {
          reservations.push({
            stock_id: stock.id,
            warehouse_id: stock.warehouse.id,
            quantity: needQuantity,
          });

          await this.productStockRepository.update(stock.id, {
            reserved: stock.reserved + needQuantity,
          });

          needQuantity = 0;
          break;
        } else {
          needQuantity -= available;
          reservations.push({
            stock_id: stock.id,
            warehouse_id: stock.warehouse.id,
            quantity: available,
          });

          await this.productStockRepository.update(stock.id, {
            reserved: stock.reserved + available,
          });
        }
      }
    }

    return reservations;
  }

  async create(payload: CreateProductStockDto) {
    return await this.productStockRepository
      .save({
        quantity: payload.quantity,
        in_stock: payload.in_stock,
        warehouse: { id: payload.warehouse_id },
        product: { id: payload.product_id },
      })
      .catch((error) => {
        throw `Не удалось добавить остатки товара, ${error.message}`;
      });
  }

  async findAll(page: string, limit: string, product_id?: number, warehouse_id?: number) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: {
      product?: FindOperator<Product>;
      warehouse?: FindOperator<Warehouse>;
    } = {};

    if (product_id) {
      whereCondition.product = { id: product_id } as unknown as FindOperator<Product>;
    }

    if (warehouse_id) {
      whereCondition.warehouse = { id: warehouse_id } as unknown as FindOperator<Warehouse>;
    }

    return this.productStockRepository
      .find({
        skip,
        take: Number(limit),
        relations: ["warehouse", "product"],
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список остатков товаров, ${error.message}`;
      });
  }

  async getTotalCount(product_id?: number, warehouse_id?: number) {
    const whereCondition: {
      product?: FindOperator<Product>;
      warehouse?: FindOperator<Warehouse>;
    } = {};

    if (product_id) {
      whereCondition.product = { id: product_id } as unknown as FindOperator<Product>;
    }

    if (warehouse_id) {
      whereCondition.warehouse = { id: warehouse_id } as unknown as FindOperator<Warehouse>;
    }

    return this.productStockRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество остатков товаров, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.productStockRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара, ${error.message}`;
      });
  }

  async findByProductId(product_id: number) {
    return this.productStockRepository
      .find({
        relations: ["product", "warehouse"],
        where: { product: { id: product_id } },
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара по ID продукта, ${error.message}`;
      });
  }

  async findByFromReservedOrder(product_id: number) {
    return this.productStockRepository
      .find({
        relations: ["warehouse", "warehouse.address"],
        where: { product: { id: product_id } },
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара по ID продукта, ${error.message}`;
      });
  }

  async checkStockAvailability(
    items: CheckingBalancesItemDto[],
  ): Promise<{ product_id: number; available: number }[]> {
    const availability: { product_id: number; available: number }[] = [];

    for (const item of items) {
      const { available, accounting } = await this.getProductAvailable(item.product_id);

      if (accounting && available < item.quantity) {
        availability.push({
          product_id: item.product_id,
          available: available,
        });
      }
    }

    return availability;
  }

  async getProductAvailable(
    product_id: number,
  ): Promise<{ available: number; accounting: boolean }> {
    const stocks = await this.findByProductId(product_id);

    return this.getStockParams(stocks);
  }

  getStockParams(stocks: ProductStock[]): { available: number; accounting: boolean } {
    let available = 0;
    let accounting = true;

    for (const stock of stocks) {
      if (stock.in_stock) {
        accounting = false;
        continue;
      }
      available += stock.quantity - stock.reserved;
    }

    return { available, accounting };
  }

  async getManyProductAvailable(
    products: number[],
  ): Promise<Record<string, { available: number; accounting: boolean }>> {
    const stocks: Record<string, { available: number; accounting: boolean }> = {};

    for (const product_id of products) {
      stocks[String(product_id)] = await this.getProductAvailable(product_id);
    }

    return stocks;
  }

  async getStocksByOrderId(orderId: number): Promise<ProductStock[]> {
    return this.productStockRepository
      .createQueryBuilder("ps")
      .innerJoin(OrderProduct, "op", "op.product_id = ps.product_id")
      .where("op.order_id = :orderId", { orderId })
      .leftJoinAndSelect("ps.warehouse", "warehouse")
      .leftJoinAndSelect("ps.product", "product")
      .getMany()
      .catch((error) => {
        throw `Не удалось получить остатки товаров по заказу, ${error.message}`;
      });
  }

  async findByWarehouseId(warehouse_id: number) {
    return this.productStockRepository
      .find({
        where: { warehouse: { id: warehouse_id } },
      })
      .catch((error) => {
        throw `Не удалось получить остатки товара по ID склада, ${error.message}`;
      });
  }

  async update(id: number, updateProductStockDto: UpdateProductStockDto) {
    return this.productStockRepository.update(id, updateProductStockDto).catch((error) => {
      throw `Не удалось обновить остатки товара, ${error.message}`;
    });
  }

  async updateQuantity(id: number, quantity: number) {
    return this.productStockRepository.update(id, { quantity }).catch((error) => {
      throw `Не удалось обновить количество остатков товара, ${error.message}`;
    });
  }

  async incrementReserved(id: number, amount: number) {
    const stock = await this.findOne(id);

    if (!stock) {
      throw "Остатки товара не найдены";
    }

    const reserved = stock.reserved;
    const quantity = stock.quantity;

    if (!stock.in_stock && quantity - reserved < amount) {
      throw `Недостаточно свободных остатков для резервирования для остатка (${id})`;
    }

    return this.productStockRepository
      .update(id, {
        reserved: reserved + amount,
      })
      .catch((error) => {
        throw `Не удалось зарезервировать товар, ${error.message}`;
      });
  }

  async changeReserved(id: number, reserved: number) {
    await this.productStockRepository.update(id, { reserved });
  }

  async decrementReserved(id: number, amount: number) {
    const stock = await this.findOne(id);

    if (!stock) {
      throw "Остатки товара не найдены";
    }

    const reserved = stock.reserved;

    if (reserved < amount) {
      throw `Невозможно снять с резерва больше, чем зарезервировано для остатка ${id}`;
    }

    return this.productStockRepository
      .update(id, {
        reserved: reserved - amount,
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
