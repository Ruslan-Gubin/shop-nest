import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Receipt, type ReceiptProduct } from "./entities/receipt.entity";
import { ProductService } from "src/product/product.service";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { ProductPriceService } from "src/product-price/product-price.service";
import type { CreateReceiptItemDto } from "./dto/create-receipt.dto";

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    private productService: ProductService,
    private productStockService: ProductStockService,
    private productPriceService: ProductPriceService,
  ) {}

  async create(payload: CreateReceiptItemDto[], userId: number) {
    if (payload.length === 0) {
      throw "Добавьте хотя бы один товар";
    }

    const products: ReceiptProduct[] = [];

    for (let i = 0; i < payload.length; i++) {
      const product = payload[i];
      let product_id = product.productId;

      if (typeof product_id === "number") {
        if (typeof product.purchasePrice === "number" && !Number.isNaN(product.purchasePrice)) {
          await this.productService.update(product_id, {
            purchase_price: product.purchasePrice,
          });
        }

        for (const key in product.priceValues) {
          const price = product.priceValues[key];

          if (typeof price !== "number") continue;

          const findPrice = await this.productPriceService.findByProductAndPriceType(
            product_id,
            Number(key),
          );

          if (findPrice) {
            if (price === 0) {
              await this.productPriceService.remove(findPrice.id);
            } else if (price > 0 && findPrice.price !== price) {
              await this.productPriceService.update(findPrice.id, { price });
            }
          } else {
            if (price > 0) {
              await this.productPriceService.create({
                product_id,
                price_type_id: Number(key),
                price,
              });
            }
          }
        }

        for (const key in product.stocks) {
          const quantity = product.stocks[key];

          if (typeof quantity !== "number" || quantity <= 0) continue;

          const findStock = await this.productStockService.findByProductAndWarehouse(
            product_id,
            Number(key),
          );

          if (findStock) {
            await this.productStockService.updateQuantity(
              findStock.id,
              findStock.quantity + quantity,
            );
          } else {
            await this.productStockService.create({
              product_id,
              warehouse_id: Number(key),
              quantity,
              reserved: 0,
              in_stock: false,
            });
          }
        }
      } else {
        if (!product.name) {
          throw "Название товара обязательно для нового товара";
        }

        const newProduct = await this.productService.create({
          name: product.name,
          code: product.code || "",
          purchase_price:
            typeof product.purchasePrice === "number" && !Number.isNaN(product.purchasePrice)
              ? product.purchasePrice
              : 0,
        } as Parameters<typeof this.productService.create>[0]);

        product_id = newProduct.id;

        for (const key in product.priceValues) {
          const price = product.priceValues[key];
          if (typeof price === "number" && price > 0) {
            await this.productPriceService.create({
              product_id,
              price_type_id: Number(key),
              price,
            });
          }
        }

        for (const key in product.stocks) {
          const quantity = product.stocks[key];

          if (typeof quantity === "number" && quantity > 0) {
            await this.productStockService.create({
              product_id,
              warehouse_id: Number(key),
              quantity,
              reserved: 0,
              in_stock: false,
            });
          }
        }
      }

      products.push({
        product_id: product_id,
        stocks: product.stocks,
        prices: product.priceValues,
      });
    }

    return this.receiptRepository.save({
      user_id: userId,
      products,
    });
  }

  async findAll(page: string, limit: string, name?: string) {
    const skip = (Number(page) - 1) * Number(limit);

    const queryBuilder = this.receiptRepository
      .createQueryBuilder("receipt")
      .skip(skip)
      .take(Number(limit))
      .orderBy("receipt.id", "DESC");

    if (name) {
      const products = await this.productService.findBySearchQuery(name);
      const productIds = products.map((p) => p.id);

      if (!productIds.length) {
        return { receipts: [] as Receipt[], totalCount: 0, paginationPage: page };
      }

      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(receipt.products) AS p
          WHERE (p->>'product_id')::int IN (:...productIds)
        )`,
        { productIds },
      );
    }

    const [receipts, totalCount] = await queryBuilder.getManyAndCount().catch((error) => {
      throw `Не удалось получить список поступлений, ${error.message}`;
    });

    return { receipts, totalCount, paginationPage: page };
  }

  async findOne(id: number) {
    const receipt = await this.receiptRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить поступление, ${error.message}`;
      });

    if (!receipt) {
      throw "Не удалось получить поступление";
    }

    const ids = receipt.products.map((p) => p.product_id);
    const productInfoList = await this.productService.getReceiptProductInfo(ids);
    const productInfo: Record<number, string> = {};

    for (const p of productInfoList) {
      productInfo[p.id] = p.name;
    }

    return { receipt, productInfo };
  }
}
