import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository, FindOperator } from "typeorm";
import { ILike, In } from "typeorm";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "./entities/product.entity";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { ProductPriceService } from "src/product-price/product-price.service";
import { CategoryService } from "src/category/category.service";
import { SearchService } from "src/search/search.service";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private productStockService: ProductStockService,
    private productPriceService: ProductPriceService,
    private categoryService: CategoryService,
    private searchService: SearchService,
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

  async getCatalog({
    page,
    limit,
    role,
    category_id,
    search,
    sort,
    price_from,
    price_to,
    specifications,
    country,
    product_types,
  }: {
    page: string;
    limit: string;
    role: string;
    category_id?: string;
    search?: string;
    sort?: string;
    price_from?: string;
    price_to?: string;
    specifications?: string;
    country?: string;
    product_types?: string;
  }): Promise<{ products: Product[]; totalCount: number; paginationPage: string }> {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const query = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.stocks", "stock")
      .leftJoinAndSelect("product.prices", "price")
      .leftJoinAndSelect("price.price_type", "priceType");

    if (category_id) {
      const categoryIds = await this.categoryService.getCategoryAndAllChildrenIds(
        Number(category_id),
      );
      if (categoryIds.length > 0) {
        query.andWhere("product.category_id IN (:...categoryIds)", { categoryIds });
      }
    }

    if (search) {
      query.andWhere("(product.name ILIKE :search OR product.description ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    const where = this.buildMainPageWhere(role);

    if (where) {
      query.andWhere(where);
    }

    const sortPriceType =
      role === "admin" || role === "moderator" || role === "wholesaler" ? "MIN" : "MAX";

    if (price_from) {
      const priceSubQuery = `(SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = product.id AND pp.price > 0)`;
      query.andWhere(`${priceSubQuery} >= :price_from`, { price_from: Number(price_from) });
    }

    if (price_to) {
      const priceSubQuery = `(SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = product.id AND pp.price > 0)`;
      query.andWhere(`${priceSubQuery} <= :price_to`, { price_to: Number(price_to) });
    }

    if (specifications) {
      const specGroups = new Map<number, string[]>();

      for (const pair of specifications.split(",")) {
        if (!pair) continue;
        const colonIdx = pair.indexOf(":");
        if (colonIdx === -1) continue;
        const specId = parseInt(pair.substring(0, colonIdx), 10);
        const value = pair.substring(colonIdx + 1);

        if (!Number.isNaN(specId) && value) {
          if (!specGroups.has(specId)) specGroups.set(specId, []);
          specGroups.get(specId)!.push(value);
        }
      }

      let idx = 0;

      for (const [specId, values] of specGroups) {
        idx++;
        query.andWhere(
          `product.id IN (SELECT ps.product_id FROM product_specification ps WHERE ps.specification_id = :specId${idx} AND ps.value IN (:...specValues${idx}))`,
          { [`specId${idx}`]: specId, [`specValues${idx}`]: values },
        );
      }
    }

    if (country) {
      const countryList = country
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (countryList.length > 0) {
        query.andWhere("product.country IN (:...countries)", { countries: countryList });
      }
    }

    if (product_types) {
      const typeList = product_types
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (typeList.length > 0) {
        query.andWhere("product.product_type IN (:...productTypes)", { productTypes: typeList });
      }
    }

    if (sort === "price_up") {
      query.addSelect(
        `COALESCE(
      (SELECT ${sortPriceType}(pp.price) FROM product_price pp WHERE pp.product_id = product.id AND pp.price > 0),
      999999999
    )`,
        "min_price",
      );
      query.orderBy("min_price", "ASC");
    } else if (sort === "price_down") {
      query.addSelect(
        `COALESCE(
      (SELECT ${sortPriceType}(pp.price) FROM product_price pp WHERE pp.product_id = product.id AND pp.price > 0),
      999999999
    )`,
        "min_price",
      );
      query.orderBy("min_price", "DESC");
    } else if (sort === "new") {
      query.orderBy("product.created_at", "DESC");
    } else if (sort === "rating") {
      query.addSelect(
        `(SELECT COALESCE(AVG(pr.rating), 0) FROM product_review pr WHERE pr.product_id = product.id AND pr.rating > 0)`,
        "avg_rating",
      );
      query.addSelect(
        `(SELECT COUNT(pr.id) FROM product_review pr WHERE pr.product_id = product.id)`,
        "review_count",
      );
      query.orderBy("avg_rating", "DESC");
      query.addOrderBy("review_count", "DESC");
    } else {
      query.addSelect(
        `(SELECT COALESCE(SUM(op.quantity), 0)
          FROM order_product op
          JOIN "order" o ON o.id = op.order_id
          WHERE op.product_id = product.id
          AND o.status = 'completed')`,
        "popularity_score",
      );
      query.orderBy("popularity_score", "DESC");
      query.addOrderBy("product.views", "DESC");
    }

    query.skip(skip).take(take);

    const [products, totalCount] = await query.getManyAndCount().catch((error) => {
      throw `Не удалось получить список товаров, ${error.message}`;
    });

    for (const product of products) {
      const stockParams = this.productStockService.getStockParams(product.stocks);
      product.available = stockParams.available;
      product.accounting = stockParams.accounting;
      product.stocks = [];
      product.purchase_price = 0;
      product.price_list = this.productPriceService.getProductUserPrices(product.prices, role);
      product.prices = [];
    }

    if (search) {
      await this.searchService.updateOrCreate({ text: search.trim(), result_count: totalCount });
    }

    return { products, totalCount, paginationPage: page };
  }

  async getFilters({
    role,
    category_id,
    search,
  }: {
    role: string;
    category_id?: string;
    search?: string;
  }): Promise<{
    price: { min: number; max: number };
    specifications: {
      id: number;
      name: string;
      type: string;
      values: string[];
    }[];
    countries: string[];
    product_types: string[];
  }> {
    const sortPriceType =
      role === "admin" || role === "moderator" || role === "wholesaler" ? "MIN" : "MAX";

    const params: unknown[] = [];
    const conditions: string[] = [];

    conditions.push(this.buildMainPageWhere(role).replace(/product\./g, "p."));

    if (category_id) {
      const categoryIds = await this.categoryService.getCategoryAndAllChildrenIds(
        Number(category_id),
      );
      if (categoryIds.length > 0) {
        params.push(categoryIds);
        conditions.push(`p.category_id = ANY($${params.length}::int[])`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
    }

    const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const priceResult = await this.productRepository
      .query(
        `
          SELECT
            COALESCE(MIN(sub.price), 0) AS min_price,
            COALESCE(MAX(sub.price), 0) AS max_price
          FROM (
            SELECT (SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0) AS price
            FROM product p
            ${whereStr}
          ) sub
        `,
        params,
      )
      .catch((error) => {
        throw `Не удалось получить диапазон цен, ${error.message}`;
      });

    const specsResult = await this.productRepository
      .query(
        `
          WITH filtered AS (
            SELECT p.id FROM product p ${whereStr}
          )
          SELECT DISTINCT
            s.id AS spec_id,
            s.name AS spec_name,
            s.type AS spec_type,
            ps.value
          FROM product_specification ps
          INNER JOIN specification s ON s.id = ps.specification_id
          WHERE ps.product_id IN (TABLE filtered)
          ORDER BY s.name, ps.value
        `,
        params,
      )
      .catch((error) => {
        throw `Не удалось получить фильтры характеристик, ${error.message}`;
      });

    const countryCondition = "p.country != ''";
    const countryWhere = whereStr
      ? `${whereStr} AND ${countryCondition}`
      : `WHERE ${countryCondition}`;

    const countriesResult = await this.productRepository
      .query(
        `
          SELECT DISTINCT p.country
          FROM product p
          ${countryWhere}
          ORDER BY p.country
        `,
        params,
      )
      .catch((error) => {
        throw `Не удалось получить список стран, ${error.message}`;
      });

    const countries = countriesResult.map((row: { country: string }) => row.country);

    const productTypeCondition = "p.product_type != ''";
    const productTypeWhere = whereStr
      ? `${whereStr} AND ${productTypeCondition}`
      : `WHERE ${productTypeCondition}`;

    const productTypesResult = await this.productRepository
      .query(
        `
          SELECT DISTINCT p.product_type
          FROM product p
          ${productTypeWhere}
          ORDER BY p.product_type
        `,
        params,
      )
      .catch((error) => {
        throw `Не удалось получить список типов товаров, ${error.message}`;
      });

    const product_types = productTypesResult.map(
      (row: { product_type: string }) => row.product_type,
    );

    const specMap = new Map<number, { id: number; name: string; type: string; values: string[] }>();

    for (const row of specsResult) {
      const specId = Number(row.spec_id);
      let spec = specMap.get(specId);

      if (!spec) {
        spec = {
          id: specId,
          name: row.spec_name,
          type: row.spec_type,
          values: [],
        };
        specMap.set(specId, spec);
      }

      spec.values.push(row.value);
    }

    for (const spec of specMap.values()) {
      spec.values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    return {
      price: {
        min: Number(priceResult[0]?.min_price ?? 0),
        max: Number(priceResult[0]?.max_price ?? 0),
      },
      specifications: Array.from(specMap.values()),
      countries,
      product_types,
    };
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

    for (let i = 0; i < ids.length; i++) {
      const fromIdx = products.findIndex((el) => el.id === ids[i]);
      if (fromIdx !== -1) {
        [products[i], products[fromIdx]] = [products[fromIdx], products[i]];
      }
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

  async incrementView(id: number) {
    return this.productRepository.increment({ id }, "views", 1).catch((error) => {
      throw `Не удалось увеличить счетчик просмотра, ${error.message}`;
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
