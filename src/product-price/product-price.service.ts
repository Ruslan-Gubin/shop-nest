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

  async getProductPricesForUser(
    user_role: string,
    product_id: string,
  ): Promise<{ price: number; minQuantity: number }[]> {
    const prices = await this.productPriceRepository
      .find({
        order: { id: "DESC" },
        where: { product_id: Number(product_id) },
        select: ["price_type_id", "price", "price_type"],
        relations: ["price_type"],
      })
      .catch((error) => {
        throw `Не удалось получить список цен товаров, ${error.message}`;
      });

    const pricesData: { price: number; minQuantity: number }[] = [];
    let bestPrice = 0;
    let bestPriceIndex: number | null = null;

    const isRoleForBestPrice =
      user_role === "admin" || user_role === "moderator" || user_role === "wholesaler";

    for (let i = 0; i < prices.length; i++) {
      const item = prices[i];
      const itemPrice = item.price;

      if (isRoleForBestPrice) {
        if ((itemPrice && !bestPrice) || (itemPrice && bestPrice && itemPrice < bestPrice)) {
          bestPrice = itemPrice;
          bestPriceIndex = i;
        }
      } else {
        if (itemPrice && prices[i].price_type.isPublic) {
          pricesData.push({
            price: item.price,
            minQuantity: item.price_type.minQuantity,
          });
        }
      }
    }

    if (isRoleForBestPrice && bestPriceIndex) {
      const bestPrice = prices[bestPriceIndex];
      if (bestPrice) {
        pricesData.push({
          price: bestPrice.price,
          minQuantity: bestPrice.price_type.minQuantity,
        });
      }
    }

    return pricesData;
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

  async getCurrentPrice(product_id: number, quantity: number, user_role: string): Promise<number> {
    let price = 0;

    const prices = await this.productPriceRepository
      .find({
        where: { product_id },
        select: ["price_type_id", "price", "price_type"],
        relations: ["price_type"],
      })
      .catch((error) => {
        throw `Не удалось получить список цен товаров, ${error.message}`;
      });

    for (let i = 0; i < prices.length; i++) {
      const itemPrice = prices[i].price ?? 0;

      if (user_role === "admin" || user_role === "moderator" || user_role === "wholesaler") {
        if ((itemPrice && !price) || (itemPrice && price && itemPrice < price)) {
          price = itemPrice;
        }
      } else {
        const minQuantity = prices[i].price_type.minQuantity ?? 1;

        if (
          prices[i].price_type.isPublic &&
          quantity >= minQuantity &&
          ((itemPrice && !price) || (itemPrice && price && itemPrice < price))
        ) {
          price = itemPrice;
        }
      }
    }

    return price;
  }
}
