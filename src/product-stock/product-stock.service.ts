import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, Repository } from "typeorm";
import type { CreateProductStockDto } from "./dto/create-product-stock.dto";
import type { UpdateProductStockDto } from "./dto/update-product-stock.dto";
import { ProductStock } from "./entities/product-stock.entity";
import { CheckingBalancesItemDto } from "./dto/checking-balances.dto";
import { AddressService } from "src/address/address.service";
import { Product } from "src/product/entities/product.entity";
import { Warehouse } from "src/warehouse/entities/warehouse.entity";

@Injectable()
export class ProductStockService {
  constructor(
    @InjectRepository(ProductStock)
    private productStockRepository: Repository<ProductStock>,
    private readonly addressRepository: AddressService,
  ) {}

  async reservedProductsForOrder(
    product_id: number,
    quantity: number,
    lng: number | undefined,
    lat: number | undefined,
  ) {
    const stocks = await this.findByProductId(product_id);

    const warehouseIds = [123, 124, 125];
    // const warehouseIds = stocks.map((el) => el.warehouse_id);

    const sortedAddress = await this.addressRepository.sortedWarehouseAddressFromOrder(
      warehouseIds,
      lng,
      lat,
    );

    let needQuantity = quantity;
    const reservations: { stock_id: number; quantity: number }[] = [];

    for (let i = 0; i < sortedAddress.length; i++) {
      const address = sortedAddress[i];
      //@ts-ignore TODO CHANGE
      const stock = stocks.find((el) => el.warehouse_id === address.warehouse_id);
      const available = stock ? stock.quantity - stock.reserved : 0;

      if (needQuantity === 0) break;

      if (stock && stock.in_stock) {
        reservations.push({ stock_id: stock.id, quantity: needQuantity });

        await this.productStockRepository.update(stock.id, {
          reserved: stock.reserved + needQuantity,
        });

        needQuantity = 0;
        break;
      }

      if (stock && needQuantity > 0 && available > 0) {
        if (available >= needQuantity) {
          reservations.push({ stock_id: stock.id, quantity: needQuantity });

          await this.productStockRepository.update(stock.id, {
            reserved: stock.reserved + needQuantity,
          });

          needQuantity = 0;
          break;
        } else {
          needQuantity -= available;
          reservations.push({ stock_id: stock.id, quantity: available });

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

  async reserve(id: number, amount: number) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw "Остатки товара не найдены";
    }
    return this.productStockRepository
      .increment({ id }, "reserved", existing.reserved + amount)
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

    return this.productStockRepository
      .update(id, {
        reserved: newReserved,
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
