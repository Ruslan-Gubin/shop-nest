import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository, FindOperator, SelectQueryBuilder } from "typeorm";
import { ILike, In, Like } from "typeorm";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "./entities/product.entity";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { ProductPriceService } from "src/product-price/product-price.service";
import { CategoryService } from "src/category/category.service";
import { SearchService } from "src/search/search.service";
import { ProductReviewService } from "src/product-review/product-review.service";
import { PhotoService } from "src/photo/photo.service";
import { Photo } from "src/photo/entities/photo.entity";
import { UserRole } from "src/users/entities/user.entity";

export type CheckStatus = "success" | "warn" | "error";

export interface FieldCheck {
  status: CheckStatus;
  message: string;
}

//TODO под вопросом
export interface ProductCompletenessCheck {
  id: number;
  name: string;
  /** @deprecated Система фото пока не реализована */
  photos: FieldCheck;
  price: FieldCheck;
  specifications: FieldCheck;
  stocks: FieldCheck;
  category: FieldCheck;
  dimensions: FieldCheck;
  country: FieldCheck;
  product_type: FieldCheck;
  equipment: FieldCheck;
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private productStockService: ProductStockService,
    private productPriceService: ProductPriceService,
    private categoryService: CategoryService,
    private searchService: SearchService,
    private productReviewService: ProductReviewService,
    private photoService: PhotoService,
  ) {}

  /** Пакетно подгружает фото товаров (parent_type='product') и раскладывает по product.photos. */
  private async attachPhotos(products: Product[]) {
    const ids = products.map((p) => p.id).filter((id) => id != null);

    if (ids.length === 0) return;

    const photos = await this.photoService.findForParents("product", ids);

    const byParent = new Map<number, Photo[]>();

    for (const photo of photos) {
      const list = byParent.get(photo.parent_id) ?? [];
      list.push(photo);
      byParent.set(photo.parent_id, list);
    }

    for (const product of products) {
      product.photos = byParent.get(product.id) ?? [];
    }
  }

  public async calculatePricesForOrder(
    productsQuantity: { product_id: number; quantity: number }[],
    role: UserRole,
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

  async findForMainPage(page: string, limit: string, role: string): Promise<[Product[], number]> {
    const skip = (Number(page) - 1) * Number(limit);
    const where = this.buildMainPageWhere(role);

    const data = await this.productRepository
      .createQueryBuilder("product")
      .where(where)
      .leftJoinAndSelect("product.stocks", "stock")
      .leftJoinAndSelect("product.prices", "price")
      .leftJoinAndSelect("price.price_type", "priceType")
      .orderBy("product.id", "DESC")
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount()
      .catch((error) => {
        throw `Не удалось получить список товаров, ${error.message}`;
      });

    await this.productReviewService.attachReviewStats(data[0]);

    for (let i = 0; i < data[0].length; i++) {
      const stock_params = this.productStockService.getStockParams(data[0][i].stocks);
      data[0][i].available = stock_params.available;
      data[0][i].accounting = stock_params.accounting;
      data[0][i].stocks = [];
      data[0][i].purchase_price = 0;
      data[0][i].price_list = this.productPriceService.getProductUserPrices(
        data[0][i].prices,
        role,
      );
      data[0][i].prices = [];
    }

    await this.attachPhotos(data[0]);

    return data;
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
  }): Promise<{
    products: Product[];
    totalCount: number;
    paginationPage: string;
  }> {
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
        query.andWhere("product.category_id IN (:...categoryIds)", {
          categoryIds,
        });
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
      query.andWhere(`${priceSubQuery} >= :price_from`, {
        price_from: Number(price_from),
      });
    }

    if (price_to) {
      const priceSubQuery = `(SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = product.id AND pp.price > 0)`;
      query.andWhere(`${priceSubQuery} <= :price_to`, {
        price_to: Number(price_to),
      });
    }

    if (specifications) {
      let idx = 0;

      for (const [specId, values] of this.parseSpecificationFilters(specifications)) {
        idx++;
        query.andWhere(
          `product.id IN (SELECT ps.product_id FROM product_specification ps WHERE ps.specification_id = :specId${idx} AND ps.value IN (:...specValues${idx}))`,
          { [`specId${idx}`]: specId, [`specValues${idx}`]: values },
        );
      }
    }

    if (country) {
      const countryList = this.parseFilterList(country);
      if (countryList.length > 0) {
        query.andWhere("product.country IN (:...countries)", {
          countries: countryList,
        });
      }
    }

    if (product_types) {
      const typeList = this.parseFilterList(product_types);
      if (typeList.length > 0) {
        query.andWhere("product.product_type IN (:...productTypes)", {
          productTypes: typeList,
        });
      }
    }

    this.applyCatalogSort(query, sort, role);

    query.skip(skip).take(take);

    const [products, totalCount] = await query.getManyAndCount().catch((error) => {
      throw `Не удалось получить список товаров, ${error.message}`;
    });

    await this.productReviewService.attachReviewStats(products);

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
      await this.searchService.updateOrCreate({
        text: search.trim(),
        result_count: totalCount,
      });
    }

    await this.attachPhotos(products);

    return { products, totalCount, paginationPage: page };
  }

  /** Применяет сортировку каталога к query-билдеру (популярность / цена / новизна / рейтинг). */
  private applyCatalogSort(
    query: SelectQueryBuilder<Product>,
    sort: string | undefined,
    role: string,
  ) {
    const sortPriceType =
      role === "admin" || role === "moderator" || role === "wholesaler" ? "MIN" : "MAX";

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
  }

  async findByBrandName({
    brand_name,
    page,
    limit,
    sort,
    role,
  }: {
    brand_name: string;
    page: string;
    limit: string;
    sort?: string;
    role: string;
  }): Promise<{
    products: Product[];
    totalCount: number;
    paginationPage: string;
  }> {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const query = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.stocks", "stock")
      .leftJoinAndSelect("product.prices", "price")
      .leftJoinAndSelect("price.price_type", "priceType")
      .andWhere("product.brand_name ILIKE :brand_name", { brand_name });

    const where = this.buildMainPageWhere(role);

    if (where) {
      query.andWhere(where);
    }

    this.applyCatalogSort(query, sort, role);

    query.skip(skip).take(take);

    const [products, totalCount] = await query.getManyAndCount().catch((error) => {
      throw `Не удалось получить товары по бренду, ${error.message}`;
    });

    await this.productReviewService.attachReviewStats(products);

    for (const product of products) {
      const stockParams = this.productStockService.getStockParams(product.stocks);
      product.available = stockParams.available;
      product.accounting = stockParams.accounting;
      product.stocks = [];
      product.purchase_price = 0;
      product.price_list = this.productPriceService.getProductUserPrices(product.prices, role);
      product.prices = [];
    }

    await this.attachPhotos(products);

    return { products, totalCount, paginationPage: page };
  }

  private parseFilterList(value?: string): string[] {
    if (!value) return [];

    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private parseSpecificationFilters(value?: string): Map<number, string[]> {
    const groups = new Map<number, string[]>();

    if (!value) return groups;

    for (const pair of value.split(",")) {
      if (!pair) continue;

      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;

      const specId = Number.parseInt(pair.substring(0, colonIdx), 10);
      const specValue = pair.substring(colonIdx + 1).trim();

      if (Number.isNaN(specId) || !specValue) continue;

      const existing = groups.get(specId);

      if (existing) {
        existing.push(specValue);
      } else {
        groups.set(specId, [specValue]);
      }
    }

    return groups;
  }

  private buildFilterConditionGroup({
    role,
    categoryIds,
    search,
    selectedProductTypes,
    selectedCountries,
    priceFrom,
    priceTo,
    specificationGroups,
    sortPriceType,
    exclude,
  }: {
    role: string;
    categoryIds: number[];
    search?: string;
    selectedProductTypes: string[];
    selectedCountries: string[];
    priceFrom?: number;
    priceTo?: number;
    specificationGroups: Map<number, string[]>;
    sortPriceType: "MIN" | "MAX";
    exclude?: "price" | "countries" | "product_types" | "specifications";
  }): { params: unknown[]; where: string } {
    const params: unknown[] = [];
    const conditions: string[] = [];

    const mainWhere = this.buildMainPageWhere(role).replace(/product\./g, "p.");

    if (mainWhere) {
      conditions.push(mainWhere);
    }

    if (categoryIds.length > 0) {
      params.push(categoryIds);
      conditions.push(`p.category_id = ANY($${params.length}::int[])`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (exclude !== "product_types" && selectedProductTypes.length > 0) {
      params.push(selectedProductTypes);
      conditions.push(`p.product_type = ANY($${params.length}::text[])`);
    }

    if (exclude !== "countries" && selectedCountries.length > 0) {
      params.push(selectedCountries);
      conditions.push(`p.country = ANY($${params.length}::text[])`);
    }

    if (exclude !== "price") {
      const priceSubQuery = `(SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0)`;

      if (priceFrom !== undefined) {
        params.push(priceFrom);
        conditions.push(`${priceSubQuery} >= $${params.length}`);
      }

      if (priceTo !== undefined) {
        params.push(priceTo);
        conditions.push(`${priceSubQuery} <= $${params.length}`);
      }
    }

    if (exclude !== "specifications") {
      for (const [specId, values] of specificationGroups) {
        params.push(specId);
        const specIdIdx = params.length;
        params.push(values);
        const valuesIdx = params.length;

        conditions.push(
          `p.id IN (SELECT ps.product_id FROM product_specification ps WHERE ps.specification_id = $${specIdIdx} AND ps.value = ANY($${valuesIdx}::text[]))`,
        );
      }
    }

    return {
      params,
      where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    };
  }

  async getFilters({
    role,
    category_id,
    search,
    product_types,
    specifications,
    country,
    price_from,
    price_to,
  }: {
    role: string;
    category_id?: string;
    search?: string;
    product_types?: string;
    specifications?: string;
    country?: string;
    price_from?: string;
    price_to?: string;
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
    const sortPriceType: "MIN" | "MAX" =
      role === "admin" || role === "moderator" || role === "wholesaler" ? "MIN" : "MAX";

    const categoryIds = category_id
      ? await this.categoryService.getCategoryAndAllChildrenIds(Number(category_id))
      : [];

    const selectedProductTypes = this.parseFilterList(product_types);
    const selectedCountries = this.parseFilterList(country);
    const specificationGroups = this.parseSpecificationFilters(specifications);
    const selectedSpecificationIds = Array.from(specificationGroups.keys());
    const priceFrom =
      price_from !== undefined && price_from !== "" && !Number.isNaN(Number(price_from))
        ? Number(price_from)
        : undefined;
    const priceTo =
      price_to !== undefined && price_to !== "" && !Number.isNaN(Number(price_to))
        ? Number(price_to)
        : undefined;

    const baseOptions = {
      role,
      categoryIds,
      search,
      selectedProductTypes,
      selectedCountries,
      priceFrom,
      priceTo,
      specificationGroups,
      sortPriceType,
    };

    const priceFilter = this.buildFilterConditionGroup({ ...baseOptions, exclude: "price" });

    const priceResult = await this.productRepository
      .query(
        `
          SELECT
            COALESCE(MIN(sub.price), 0) AS min_price,
            COALESCE(MAX(sub.price), 0) AS max_price
          FROM (
            SELECT (SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0) AS price
            FROM product p
            ${priceFilter.where}
          ) sub
        `,
        priceFilter.params,
      )
      .catch((error) => {
        throw `Не удалось получить диапазон цен, ${error.message}`;
      });

    const countriesFilter = this.buildFilterConditionGroup({
      ...baseOptions,
      exclude: "countries",
    });
    const countriesWhere = countriesFilter.where
      ? `${countriesFilter.where} AND p.country != ''`
      : `WHERE p.country != ''`;

    const countriesResult = await this.productRepository
      .query(
        `
          SELECT DISTINCT p.country
          FROM product p
          ${countriesWhere}
          ORDER BY p.country
        `,
        countriesFilter.params,
      )
      .catch((error) => {
        throw `Не удалось получить список стран, ${error.message}`;
      });

    const countries = countriesResult.map((row: { country: string }) => row.country);

    const productTypesFilter = this.buildFilterConditionGroup({
      ...baseOptions,
      exclude: "product_types",
    });
    const productTypesWhere = productTypesFilter.where
      ? `${productTypesFilter.where} AND p.product_type != ''`
      : `WHERE p.product_type != ''`;

    const productTypesResult = await this.productRepository
      .query(
        `
          SELECT DISTINCT p.product_type
          FROM product p
          ${productTypesWhere}
          ORDER BY p.product_type
        `,
        productTypesFilter.params,
      )
      .catch((error) => {
        throw `Не удалось получить список типов товаров, ${error.message}`;
      });

    const productTypes = productTypesResult.map(
      (row: { product_type: string }) => row.product_type,
    );

    const hideSpecifications =
      selectedProductTypes.length > 1 ||
      (selectedProductTypes.length === 0 && productTypes.length > 1);

    let specsResult: {
      spec_id: number | string;
      spec_name: string;
      spec_type: string;
      value: string;
    }[] = [];

    if (!hideSpecifications) {
      // Характеристики считаем с учётом ВСЕХ активных фильтров, включая сами характеристики.
      const specsFilter = this.buildFilterConditionGroup(baseOptions);
      const specsParams: unknown[] = [...specsFilter.params];

      let selectedSpecIdsCondition = "";

      if (selectedSpecificationIds.length > 0) {
        specsParams.push(selectedSpecificationIds);
        selectedSpecIdsCondition = `s.id = ANY($${specsParams.length}::int[])`;
      }

      // Активные характеристики оставляем видимыми, даже если у них осталось одно значение.
      const keepSelectedSpecsCondition = selectedSpecIdsCondition
        ? `COUNT(DISTINCT ps.value) > 1 OR ${selectedSpecIdsCondition}`
        : `COUNT(DISTINCT ps.value) > 1`;
      const selectedSpecsOrder = selectedSpecIdsCondition
        ? `(${selectedSpecIdsCondition}) DESC, `
        : "";

      specsResult = await this.productRepository
        .query(
          `
            WITH filtered AS (
              SELECT p.id FROM product p ${specsFilter.where}
            ),
            spec_stats AS (
              SELECT
                s.id,
                s.name,
                s.type,
                COUNT(DISTINCT ps.value)::int AS value_count,
                COUNT(DISTINCT ps.product_id)::int AS product_count
              FROM product_specification ps
              INNER JOIN specification s ON s.id = ps.specification_id
              WHERE ps.product_id IN (SELECT id FROM filtered)
                AND s.name NOT IN ('Артикул', 'Штрих-код', 'Код товара')
              GROUP BY s.id, s.name, s.type
              HAVING ${keepSelectedSpecsCondition}
              ORDER BY ${selectedSpecsOrder}value_count DESC, product_count DESC, s.name
              LIMIT 5
            )
            SELECT
              ss.id AS spec_id,
              ss.name AS spec_name,
              ss.type AS spec_type,
              ps.value
            FROM spec_stats ss
            INNER JOIN product_specification ps ON ps.specification_id = ss.id
            INNER JOIN filtered f ON f.id = ps.product_id
            GROUP BY
              ss.id,
              ss.name,
              ss.type,
              ps.value,
              ss.value_count,
              ss.product_count
            ORDER BY ss.value_count DESC, ss.product_count DESC, ss.name, ps.value
          `,
          specsParams,
        )
        .catch((error) => {
          throw `Не удалось получить фильтры характеристик, ${error.message}`;
        });
    }

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

    const selectedSpecIdsSet = new Set(selectedSpecificationIds);

    return {
      price: {
        min: Number(priceResult[0]?.min_price ?? 0),
        max: Number(priceResult[0]?.max_price ?? 0),
      },
      specifications: Array.from(specMap.values()).filter(
        (spec) => spec.values.length > 1 || selectedSpecIdsSet.has(spec.id),
      ),
      countries,
      product_types: productTypes,
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

    await this.productReviewService.attachReviewStats(products);

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

    for (let i = 0; i < ids.length && i < products.length; i++) {
      const fromIdx = products.findIndex((el) => el.id === ids[i]);
      if (fromIdx !== -1) {
        [products[i], products[fromIdx]] = [products[fromIdx], products[i]];
      }
    }

    await this.attachPhotos(products);

    return products;
  }

  async findByCategoryId(categoryId: number): Promise<Product[]> {
    const products = await this.productRepository
      .find({ where: { category_id: categoryId } })
      .catch((error) => {
        throw `Не удалось получить товары для категории, ${error.message}`;
      });

    await this.attachPhotos(products);

    return products;
  }

  /**
   * Похожие товары
   * Принцип сбора: товары из той же категории, отсортированные по количеству
   * совпадающих спецификаций (product_specification) с текущим товаром DESC.
   * При равенстве — сортировка по популярности (продажи в completed заказах + просмотры).
   * Текущий товар исключается из результатов.
   */
  async findSimilar(productId: number, limit: number, role: string): Promise<Product[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ["id", "category_id"],
    });

    const categoryIds = product?.category_id
      ? await this.categoryService.getCategoryAndAllChildrenIds(product.category_id)
      : [];

    if (!categoryIds.length) return [];

    const idsResult = await this.productRepository
      .query(
        `
          SELECT
            p.id,
            COUNT(DISTINCT ps_matched.specification_id)::int AS match_count,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN op.quantity ELSE 0 END), 0)::int AS popularity
          FROM product p
          LEFT JOIN product_specification ps_matched
            ON ps_matched.product_id = p.id
            AND ps_matched.specification_id IN (
              SELECT specification_id FROM product_specification WHERE product_id = $1
            )
          LEFT JOIN order_product op ON op.product_id = p.id
          LEFT JOIN "order" o ON o.id = op.order_id AND o.status = 'completed'
          WHERE p.category_id = ANY($2::int[])
            AND p.id != $1
            AND EXISTS (
              SELECT 1 FROM product_stock stock
              WHERE stock.product_id = p.id
                AND (stock.quantity - stock.reserved > 0 OR stock.in_stock)
            )
          GROUP BY p.id
          ORDER BY match_count DESC, popularity DESC, p.views DESC
          LIMIT $3
        `,
        [productId, categoryIds, limit],
      )
      .catch((error) => {
        throw `Не удалось получить похожие товары, ${error.message}`;
      });

    const ids = idsResult.map((r: { id: string }) => Number(r.id));

    return ids.length > 0 ? this.findByIds(ids, role) : [];
  }

  /**
   * Покупают вместе
   * Принцип сбора: находятся все завершённые заказы (status = 'completed'),
   * содержащие любой из переданных товаров. Для каждого другого товара в этих
   * заказах подсчитывается суммарное количество (frequency). Результат
   * сортируется по убыванию частоты совместной покупки.
   * Переданные товары исключаются из результатов.
   */
  async findBoughtTogether(productIds: number[], limit: number, role: string): Promise<Product[]> {
    if (!productIds.length) return [];

    const idsResult = await this.productRepository
      .query(
        `
          WITH target_orders AS (
            SELECT DISTINCT op.order_id
            FROM order_product op
            JOIN "order" o ON o.id = op.order_id
            WHERE op.product_id = ANY($1::int[])
              AND o.status = 'completed'
          )
          SELECT
            op.product_id,
            COALESCE(SUM(op.quantity), 0)::int AS co_count
          FROM order_product op
          WHERE op.order_id IN (SELECT order_id FROM target_orders)
            AND op.product_id != ALL($1::int[])
          GROUP BY op.product_id
          ORDER BY co_count DESC
          LIMIT $2
        `,
        [productIds, limit],
      )
      .catch((error) => {
        throw `Не удалось получить товары для блока "покупают вместе", ${error.message}`;
      });

    const ids = idsResult.map((r: { product_id: string }) => Number(r.product_id));

    return ids.length > 0 ? this.findByIds(ids, role) : [];
  }

  /**
   * Рекомендуем — Content-Based Personalization
   *
   * ─── ВХОДНЫЕ ДАННЫЕ ───
   * Метод получает три массива ID товаров, с которыми пользователь взаимодействовал:
   *   favoriteIds — товары, добавленные в избранное                               (вес ×3)
   *   cartIds     — товары, добавленные в корзину                                 (вес ×2)
   *   viewedIds   — товары, которые пользователь просто просматривал              (вес ×1)
   *
   * Все эти товары автоматически ИСКЛЮЧАЮТСЯ из результата (уже знакомы).
   * Если все три массива пусты — срабатывает fallback: топ по просмотрам (views).
   *
   * ─── ТАБЛИЦЫ ───
   *   product              — товары (id, category_id, views, ...)
   *   product_specification — характеристики товаров (product_id, specification_id, value)
   *     Пример: товар(7) → spec(3, "Цвет") → "Красный", spec(5, "Материал") → "Хлопок"
   *   order_product        — товары в заказах (product_id, quantity)
   *   order                — заказы (id, status)
   *     status = 'completed' — успешно завершённые
   *   product_stock        — остатки на складах (product_id, quantity, reserved, in_stock)
   *   product_review       — отзывы/оценки (product_id, rating 0-5)
   *
   * ─── ЭТАП 1: ПОСТРОЕНИЕ ПРОФИЛЯ ВКУСА ───
   * Для каждого товара из сигналов определяется его максимальный вес среди источников
   * (MAX по fav×3 / cart×2 / viewed×1). Это решает проблему задвоения:
   * если товар одновременно в избранном и в корзине — его вес = 3, а не 3+2.
   *
   * Затем все спецификации этих товаров собираются в user_profile:
   *   (specification_id, value) → SUM(weight)
   *
   *   Пример: пользователь лайкнул красную хлопковую футболку (×3) и добавил
   *   в корзину красные кроссовки (×2). Профиль:
   *     spec(Цвет, "Красный")         → вес 5  (3 + 2 — два независимых сигнала)
   *     spec(Материал, "Хлопок")      → вес 3
   *     spec(Тип, "Обувь")            → вес 2
   *
   * Чем больше независимых сигналов сходятся на одной характеристике — тем выше её вес.
   * Если у сигнального товара нет характеристик — он не даёт вклада в профиль.
   *
   * ─── ЭТАП 2: ОЦЕНКА КАЖДОГО ТОВАРА ───
   * Для каждого товара в БД (кроме исключённых, при наличии на складе) вычисляется:
   *
   *   spec_score  = Σ(weight_sum совпавшей spec из user_profile)
   *     — через correlated subquery: для товара берутся его specification_id + value,
   *       джойнятся с user_profile, суммируются веса совпадений
   *     — если у товара нет характеристик или ни одна не совпала → spec_score = 0
   *
   *   popularity  = Σ(op.quantity) по order_product в completed заказах
   *     — через correlated subquery: собираются все завершённые заказы, где был этот товар
   *     — чем больше штук продано — тем выше
   *     — если не продавался ни разу → popularity = 0
   *
   *
   *   avg_rating  = AVG(pr.rating) по product_review (0–5)
   *     — через correlated subquery: средняя оценка всех отзывов на товар
   *     — если отзывов нет → avg_rating = 0
   *
   *   review_count = COUNT(pr.id) по product_review
   *     — количество отзывов; чем больше — тем статистически надёжнее рейтинг
   *     — работает как tiebreaker: при равном avg_rating выше тот, у кого больше отзывов
   *
   * ─── ЭТАП 3: СОРТИРОВКА ───
   *   spec_score DESC → popularity DESC → avg_rating DESC → review_count DESC → p.views DESC
   *
   *   Приоритет у товаров, максимально похожих на профиль пользователя.
   *   При равенстве совпадений — те, что лучше продаются.
   *   При равенстве продаж — те, что выше оценены покупателями.
   *   При равном рейтинге — те, у кого больше отзывов (надёжнее статистика).
   *
   * ─── ЭТАП 4: DIVERSITY ───
   * Из отсортированного списка (LIMIT = limit × 2) выбирается максимум 3 товара
   * из одной категории (category_id). Остальные отбрасываются.
   * Это нужно, чтобы рекомендации не состояли из 10 футболок одного цвета,
   * а показывали разные категории товаров.
   *
   * ─── ЭТАП 5: ДОГРУЗКА ЦЕН И ОСТАТКОВ ───
   * Финальный список ID передаётся в findByIds, который:
   *   — загружает полные данные (название, описание, фото...)
   *   — джойнит stocks и prices
   *   — вычисляет доступное количество (available = quantity - reserved)
   *   — вычисляет цену для роли пользователя (админ/опт/розница)
   *   — возвращает готовый массив Product[]
   *
   * ─── FALLBACK (НЕТ СИГНАЛОВ) ───
   * Если пользователь анонимен или не совершал никаких действий — возвращаются
   * товары, отсортированные по просмотрам DESC (самые популярные).
   */

  async findRecommended(
    favoriteIds: number[],
    cartIds: number[],
    viewedIds: number[],
    limit: number,
    role: string,
  ): Promise<Product[]> {
    // Все ID, с которыми пользователь уже взаимодействовал — исключаем
    const excludeIds = [...new Set([...favoriteIds, ...cartIds, ...viewedIds])];

    // Fallback: если нет сигналов — pure popularity
    if (!excludeIds.length) {
      return this.findRecommendedFallback(limit, role);
    }

    // Ограничиваем просмотренные для производительности (последние 200)
    const cappedViewedIds = viewedIds.slice(-200);

    // Строим профиль вкуса и получаем ID с сортировкой
    const idsResult = await this.productRepository
      .query(
        `
          -- Шаг 1: определяем максимальный вес для каждого продукта-сигнала
          -- (если товар одновременно в избранном и корзине — берём MAX = 3, а не сумму)
          WITH signal_products AS (
            SELECT product_id, MAX(weight) AS product_weight
            FROM (
              SELECT product_id, 3 AS weight
              FROM product_specification
              WHERE product_id = ANY($1::int[])
              UNION ALL
              SELECT product_id, 2 AS weight
              FROM product_specification
              WHERE product_id = ANY($2::int[])
              UNION ALL
              SELECT product_id, 1 AS weight
              FROM product_specification
              WHERE product_id = ANY($3::int[])
            ) src
            GROUP BY product_id
          ),
          -- Шаг 2: агрегируем спецификации с весом продукта-сигнала
          user_profile AS (
            SELECT ps.specification_id, ps.value, SUM(sp.product_weight) AS weight_sum
            FROM signal_products sp
            INNER JOIN product_specification ps ON ps.product_id = sp.product_id
            GROUP BY ps.specification_id, ps.value
          )
          SELECT
            p.id,
            p.category_id,
            COALESCE((
              SELECT SUM(up.weight_sum)
              FROM product_specification ps
              INNER JOIN user_profile up
                ON up.specification_id = ps.specification_id
                AND up.value = ps.value
              WHERE ps.product_id = p.id
            ), 0)::int AS spec_score,
            COALESCE((
              SELECT SUM(op.quantity)
              FROM order_product op
              INNER JOIN "order" o ON o.id = op.order_id
              WHERE op.product_id = p.id AND o.status = 'completed'
            ), 0)::int AS popularity,
            COALESCE((
              SELECT AVG(pr.rating) FROM product_review pr
              WHERE pr.product_id = p.id AND pr.rating > 0
            ), 0)::float AS avg_rating,
            COALESCE((
              SELECT COUNT(pr.id) FROM product_review pr
              WHERE pr.product_id = p.id
            ), 0)::int AS review_count
          FROM product p
          WHERE NOT (p.id = ANY($4::int[]))
            AND EXISTS (
              SELECT 1 FROM product_stock stock
              WHERE stock.product_id = p.id
                AND (stock.quantity - stock.reserved > 0 OR stock.in_stock)
            )
          ORDER BY spec_score DESC, popularity DESC, avg_rating DESC, review_count DESC, p.views DESC
          LIMIT $5
        `,
        [favoriteIds, cartIds, cappedViewedIds, excludeIds, limit * 2],
      )
      .catch((error) => {
        throw `Не удалось получить рекомендованные товары, ${error.message}`;
      });

    // Diversity: не более 3 товаров из одной категории
    const categoryCount = new Map<number, number>();
    const diversifiedIds: number[] = [];

    for (const row of idsResult) {
      const catId = Number(row.category_id);
      const count = categoryCount.get(catId) ?? 0;
      if (count < 3) {
        categoryCount.set(catId, count + 1);
        diversifiedIds.push(Number(row.id));
      }
      if (diversifiedIds.length >= limit) break;
    }

    return diversifiedIds.length ? this.findByIds(diversifiedIds, role) : [];
  }

  /**
   * Fallback для findRecommended — pure popularity
   * Сортировка: продажи в completed заказах DESC, затем просмотры DESC.
   */
  private async findRecommendedFallback(limit: number, role: string): Promise<Product[]> {
    const idsResult = await this.productRepository
      .query(
        `
          SELECT p.id
          FROM product p
          WHERE EXISTS (
            SELECT 1 FROM product_stock stock
            WHERE stock.product_id = p.id
              AND (stock.quantity - stock.reserved > 0 OR stock.in_stock)
          )
          ORDER BY p.views DESC
          LIMIT $1
        `,
        [limit],
      )
      .catch((error) => {
        throw `Не удалось получить популярные товары, ${error.message}`;
      });

    const ids = idsResult.map((r: { id: string }) => Number(r.id));

    return ids.length ? this.findByIds(ids, role) : [];
  }

  async findRunningLow(): Promise<Product[]> {
    const idsResult = await this.productRepository
      .query(
        `
        SELECT p.id
        FROM product p
        JOIN product_stock ps ON ps.product_id = p.id
        LEFT JOIN (
          SELECT op.product_id, SUM(op.quantity) / 90.0 AS avg_qty
          FROM order_product op
          JOIN "order" o ON o.id = op.order_id
          WHERE o.status = 'completed'
            AND o.created_at >= NOW() - INTERVAL '90 days'
          GROUP BY op.product_id
        ) sales ON sales.product_id = p.id
        WHERE ps.in_stock = false
        GROUP BY p.id
        HAVING SUM(ps.quantity - ps.reserved) >= 0
          AND COALESCE(AVG(sales.avg_qty), 0) > 0
          AND SUM(ps.quantity - ps.reserved) / AVG(sales.avg_qty) <= 30
        ORDER BY SUM(ps.quantity - ps.reserved) / AVG(sales.avg_qty) ASC
        LIMIT 10
      `,
      )
      .catch((error) => {
        throw `Не удалось получить товары с малым остатком, ${error.message}`;
      });

    const ids = idsResult.map((r: { id: string }) => Number(r.id));

    return ids.length > 0 ? this.findByIds(ids, "admin") : [];
  }

  async getIncompleteProducts(
    page: number,
    limit: number,
  ): Promise<{
    products: ProductCompletenessCheck[];
    totalCount: number;
    paginationPage: number;
  }> {
    const offset = (page - 1) * limit;

    const rows: {
      id: number;
      name: string;
      category_id: number | null;
      has_price: boolean;
      has_specs: boolean;
      has_stocks: boolean;
      has_valid_category: boolean;
      has_country: boolean;
      has_product_type: boolean;
      has_equipment: boolean;
      dims_filled: number;
      error_score: number;
      warn_score: number;
      total_count: number;
    }[] = await this.productRepository
      .query(
        `
        SELECT
          sub.*,
          (
            CASE WHEN sub.has_price THEN 0 ELSE 2 END +
            CASE WHEN sub.has_specs THEN 0 ELSE 2 END +
            CASE WHEN sub.has_stocks THEN 0 ELSE 2 END +
            CASE WHEN sub.has_valid_category THEN 0 ELSE 2 END
          ) AS error_score,
          (
            CASE WHEN sub.dims_filled = 4 THEN 0 WHEN sub.dims_filled > 0 THEN 1 ELSE 1 END +
            CASE WHEN sub.has_country THEN 0 ELSE 1 END +
            CASE WHEN sub.has_product_type THEN 0 ELSE 1 END +
            CASE WHEN sub.has_equipment THEN 0 ELSE 1 END
          ) AS warn_score,
          COUNT(*) OVER() AS total_count
        FROM (
          SELECT
            p.id,
            p.name,
            p.category_id,
            p.weight,
            p.height,
            p.length,
            p.width,
            p.country,
            p.product_type,
            p.equipment,
            EXISTS (SELECT 1 FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0) AS has_price,
            EXISTS (SELECT 1 FROM product_specification ps WHERE ps.product_id = p.id) AS has_specs,
            EXISTS (SELECT 1 FROM product_stock ps2 WHERE ps2.product_id = p.id) AS has_stocks,
            CASE
              WHEN p.category_id IS NULL THEN false
              WHEN EXISTS (SELECT 1 FROM category c WHERE c.parent_id = p.category_id) THEN false
              ELSE true
            END AS has_valid_category,
            p.country != '' AS has_country,
            p.product_type != '' AS has_product_type,
            p.equipment != '' AS has_equipment,
            (CASE WHEN COALESCE(p.weight, 0) > 0 THEN 1 ELSE 0 END +
             CASE WHEN COALESCE(p.height, 0) > 0 THEN 1 ELSE 0 END +
             CASE WHEN COALESCE(p.length, 0) > 0 THEN 1 ELSE 0 END +
             CASE WHEN COALESCE(p.width, 0) > 0 THEN 1 ELSE 0 END) AS dims_filled
          FROM product p
        ) sub
        WHERE NOT (
          sub.has_price
          AND sub.has_specs
          AND sub.has_stocks
          AND sub.has_valid_category
          AND sub.has_country
          AND sub.has_product_type
          AND sub.has_equipment
          AND sub.dims_filled = 4
        )
        ORDER BY error_score DESC, warn_score DESC, sub.name ASC
        LIMIT $1
        OFFSET $2
      `,
        [limit, offset],
      )
      .catch((error) => {
        throw `Не удалось получить товары для проверки, ${error.message}`;
      });

    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const products: ProductCompletenessCheck[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      products.push({
        id: row.id,
        name: row.name,
        photos: { status: "success", message: "В порядке" },
        price: {
          status: row.has_price ? "success" : "error",
          message: row.has_price ? "В порядке" : "Нет цены",
        },
        specifications: {
          status: row.has_specs ? "success" : "error",
          message: row.has_specs ? "В порядке" : "Нет характеристик",
        },
        stocks: {
          status: row.has_stocks ? "success" : "error",
          message: row.has_stocks ? "В порядке" : "Нет остатков",
        },

        category: {
          status: row.has_valid_category ? "success" : "error",
          message: row.has_valid_category
            ? "В порядке"
            : row.category_id
              ? "Категория не конечная"
              : "Нет категории",
        },
        dimensions: {
          status: Number(row.dims_filled) === 4 ? "success" : "warn",
          message:
            Number(row.dims_filled) === 4
              ? "В порядке"
              : Number(row.dims_filled) > 0
                ? "Указаны не все габариты"
                : "Нет габаритов",
        },
        country: {
          status: row.has_country ? "success" : "warn",
          message: row.has_country ? "В порядке" : "Нет",
        },
        product_type: {
          status: row.has_product_type ? "success" : "warn",
          message: row.has_product_type ? "В порядке" : "Нет",
        },
        equipment: {
          status: row.has_equipment ? "success" : "warn",
          message: row.has_equipment ? "В порядке" : "Нет",
        },
      });
    }

    return { products, totalCount, paginationPage: page };
  }

  async getFullPathCategories(productId: number) {
    const product = await this.findOne(productId);

    return product?.category_id
      ? await this.categoryService.getFullPathFromCategory(product.category_id)
      : [];
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

    const products = await this.productRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список товаров, ${error.message}`;
      });

    await this.attachPhotos(products);

    return products;
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

  async getReceiptProductInfo(ids: number[]): Promise<{ id: number; name: string }[]> {
    if (!ids.length) return [];

    return this.productRepository
      .find({
        where: { id: In(ids) },
        select: ["id", "name"],
      })
      .catch((error) => {
        throw `Не удалось получить информацию о товарах, ${error.message}`;
      });
  }

  async findBySearchQuery(q: string): Promise<Product[]> {
    const query = q.trim();

    if (!query) {
      return [];
    }

    const whereCondition = /^\d+$/.test(query)
      ? { code: Like(`${query}%`) }
      : { name: ILike(`%${query}%`) };

    const products = await this.productRepository
      .find({
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось найти товары по запросу, ${error.message}`;
      });

    await this.attachPhotos(products);

    return products;
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOneBy({ id }).catch((error) => {
      throw `Не удалось получить товар, ${error.message}`;
    });

    if (product) {
      await this.productReviewService.attachReviewStats([product]);
      await this.attachPhotos([product]);
    }

    return product;
  }

  async findByCode(code: string) {
    return this.productRepository.findOne({ where: { code } }).catch((error) => {
      throw `Не удалось найти товар по коду, ${error.message}`;
    });
  }

  async incrementView(id: number) {
    return this.productRepository.increment({ id }, "views", 1).catch((error) => {
      throw `Не удалось увеличить счетчик просмотра, ${error.message}`;
    });
  }

  async getTotalSold(productId: number): Promise<number> {
    const result = await this.productRepository.query(
      `
      SELECT COALESCE(SUM(op.quantity), 0)::int AS total_sold
      FROM order_product op
      INNER JOIN "order" o ON o.id = op.order_id
      WHERE op.product_id = $1
        AND o.status = 'completed'
      `,
      [productId],
    );
    return Number(result[0]?.total_sold ?? 0);
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

  async findProductsCanReview(
    user_id: number,
    page: number,
    limit: number,
  ): Promise<[Product[], number]> {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productRepository
      .createQueryBuilder("p")
      .where(
        `EXISTS (
          SELECT 1 FROM order_product op
          INNER JOIN "order" o ON o.id = op.order_id
          WHERE op.product_id = p.id
            AND o.create_user_id = :user_id
            AND o.status = 'completed'
        )`,
        { user_id },
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM product_review pr
          WHERE pr.product_id = p.id
            AND pr.create_user_id = :user_id
        )`,
        { user_id },
      )
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount()
      .catch((error) => {
        throw `Не удалось получить товары для отзыва, ${error.message}`;
      });
  }

  async findProductsWithReviews(
    user_id: number,
    page: number,
    limit: number,
  ): Promise<[Product[], number]> {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productRepository
      .createQueryBuilder("p")
      .where(
        `EXISTS (
          SELECT 1 FROM product_review pr
          WHERE pr.product_id = p.id
            AND pr.create_user_id = :user_id
        )`,
        { user_id },
      )
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount()
      .catch((error) => {
        throw `Не удалось получить товары с отзывами, ${error.message}`;
      });
  }

  async findProductsWithQuestions(
    user_id: number,
    page: number,
    limit: number,
  ): Promise<[Product[], number]> {
    const skip = (Number(page) - 1) * Number(limit);

    return this.productRepository
      .createQueryBuilder("p")
      .where(
        `EXISTS (
          SELECT 1 FROM product_question pq
          WHERE pq.product_id = p.id
            AND pq.create_user_id = :user_id
        )`,
        { user_id },
      )
      .skip(skip)
      .take(Number(limit))
      .getManyAndCount()
      .catch((error) => {
        throw `Не удалось получить товары с вопросами, ${error.message}`;
      });
  }

  async canReview(product_id: number, create_user_id: number): Promise<boolean> {
    return this.productRepository
      .createQueryBuilder("p")
      .where("p.id = :product_id", { product_id })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM order_product op
          INNER JOIN "order" o ON o.id = op.order_id
          WHERE op.product_id = p.id
            AND o.create_user_id = :create_user_id
            AND o.status = 'completed'
        )`,
        { create_user_id },
      )
      .getExists()
      .catch((error) => {
        throw `Не удалось проверить возможность оставить отзыв, ${error.message}`;
      });
  }
}
