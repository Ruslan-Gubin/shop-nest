import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository, FindOperator } from "typeorm";
import { ILike } from "typeorm";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "./entities/product.entity";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { ProductPriceService } from "src/product-price/product-price.service";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private productStockService: ProductStockService,
    private productPriceService: ProductPriceService,
  ) {}

  private buildMainPageWhere(role: string): string {
    let where = `EXISTS (
  SELECT 1 FROM product_stock stock
  WHERE stock.product_id = product.id
    AND (stock.quantity - stock.reserved > 0 OR stock.in_stock)
)`;

    if (role === "admin" || role === "moderator" || role === "wholesaler") {
      where += ` AND EXISTS (
    SELECT 1 FROM product_price price
    WHERE price.product_id = product.id AND price.price > 0
  )`;
    } else {
      where += ` AND EXISTS (
    SELECT 1 FROM product_price price
    INNER JOIN price_type type ON type.id = price.price_type_id
    WHERE price.product_id = product.id
      AND price.price > 0
      AND type."isPublic" = true
  )`;
    }

    return where;
  }

  async findForMainPage(page: string, limit: string, role: string) {
    const skip = (Number(page) - 1) * Number(limit);
    const where = this.buildMainPageWhere(role);

    const products = await this.productRepository
      .createQueryBuilder("product")
      .where(where)
      .leftJoinAndSelect("product.stocks", "stock")
      .leftJoinAndSelect("product.prices", "price")
      .leftJoinAndSelect("price.price_type", "priceType")
      .orderBy("product.id", "DESC")
      .skip(skip)
      .take(Number(limit))
      .getMany()
      .catch((error) => {
        throw `Не удалось получить список товаров, ${error.message}`;
      });

    for (let i = 0; i < products.length; i++) {
      const stock_params = this.productStockService.getStockParams(products[i].stocks);
      products[i].available = stock_params.available;
      products[i].accounting = stock_params.accounting;
      products[i].stocks = [];
      products[i].purchase_price = 0;
      products[i].price_list = this.productPriceService.getProductUserPrices(
        products[i].prices,
        role,
      );
      products[i].prices = [];
    }

    return products;
  }

  async getTotalCountForMainPage(role: string) {
    const where = this.buildMainPageWhere(role);

    return this.productRepository
      .createQueryBuilder("product")
      .where(where)
      .getCount()
      .catch((error) => {
        throw `Не удалось получить общее количество товаров, ${error.message}`;
      });
  }

  async create(createProductDto: CreateProductDto) {
    return this.productRepository.save(createProductDto).catch((error) => {
      throw `Не удалось добавить товаров, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string, name: string) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
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
      whereCondition.name = ILike(`%${name}%`);
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
