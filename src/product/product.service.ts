import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository, FindOperator } from "typeorm";
import { ILike, In } from "typeorm";
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

  public async calculatePricesForOrder(
    productsQuantity: { product_id: number; quantity: number }[],
    role: string,
  ) {
    const ids = productsQuantity.map((el) => el.product_id);
    const products = await this.findByIds(ids, role);
    const productOptionsMap: Map<number, { quantity: number; price: number }> = new Map();

    let discount_quantity = 0;
    let subtotal = 0;
    let total = 0;

    for (let i = 0; i < products.length; i++) {
      const productCount = productsQuantity.find(
        (el) => el.product_id === products[i].id,
      )?.quantity;
      const priceList = products[i].price_list;

      if (Array.isArray(priceList) && typeof productCount === "number" && productCount > 0) {
        const { price, subPrice } = this.getCurrentPrices(productCount, priceList);

        if (price > 0 && subPrice > 0) {
          total += productCount * price;
          subtotal += productCount * subPrice;

          productOptionsMap.set(products[i].id, {
            quantity: productCount,
            price: price,
          });
        }
      }
    }

    if (subtotal > total) {
      discount_quantity = subtotal - total;
    }

    return { total, subtotal, discount_quantity, products, productOptionsMap };
  }

  private getCurrentPrices(
    productCount: number,
    priceList: { price: number; minQuantity: number }[],
  ) {
    let price = 0;
    let subPrice = 0;

    for (let i = 0; i < priceList.length; i++) {
      const itemPrice = priceList[i].price;
      const minQuantity = priceList[i].minQuantity;

      if (typeof itemPrice !== "number" || typeof minQuantity !== "number") continue;

      if (productCount >= minQuantity && (!price || itemPrice < price)) {
        price = itemPrice;
      }

      if (subPrice < itemPrice) {
        subPrice = itemPrice;
      }
    }

    return { price, subPrice };
  }

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

  async findByIds(ids: number[], role: string) {
    const products = await this.productRepository
      .find({
        where: { id: In(ids) },
        relations: ["stocks", "prices", "prices.price_type"],
      })
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
