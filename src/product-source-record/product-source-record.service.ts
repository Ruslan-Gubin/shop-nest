import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductSourceRecord } from "./entities/product-source-record.entity";
import { ProductService } from "src/product/product.service";
import { CreateProductDto } from "src/product/dto/create-product.dto";
import { ProductPriceService } from "src/product-price/product-price.service";
import { PriceTypeService } from "src/price-type/price-type.service";
import { ProductSpecificationService } from "src/product-specification/product-specification.service";
import { SpecificationsService } from "src/specifications/specifications.service";
import { CategoryService } from "src/category/category.service";
import { CheckImportItemDto } from "./dto/check-import-items.dto";
import { CreateProductFromRecordDto } from "./dto/create-product-from-record.dto";
import { RecordCategories, SaveGeneratedRecordDto } from "./dto/save-record.dto";

@Injectable()
export class ProductSourceRecordService {
  constructor(
    @InjectRepository(ProductSourceRecord)
    private readonly productSourceRecordRepository: Repository<ProductSourceRecord>,
    private readonly productService: ProductService,
    private readonly productPriceService: ProductPriceService,
    private readonly priceTypeService: PriceTypeService,
    private readonly productSpecificationService: ProductSpecificationService,
    private readonly specificationsService: SpecificationsService,
    private readonly categoryService: CategoryService,
  ) {}

  async createProductFromRecord(payload: CreateProductFromRecordDto) {
    const record = await this.findRecord(payload.barcode);

    if (!record) {
      throw `Не найдена запись для штрих-кода ${payload.barcode}. Сначала сгенерируйте данные о товаре`;
    }

    const existingProduct = await this.productService.findByCode(payload.barcode);

    if (existingProduct) {
      throw `Товар с штрих-кодом ${payload.barcode} уже существует (ID: ${existingProduct.id})`;
    }

    const createProductDto: CreateProductDto = {
      category_id: null,
      purchase_price: 0,
      name: record.name || "",
      code: payload.barcode,
      description: record.description || "",
      product_type: record.product_type || "",
      equipment: record.equipment || "",
      country: record.country || "",
      brand_name: record.brand_name || "",
      weight: record.weight,
      height: record.height,
      length: record.length,
      width: record.width,
      seo_title: record.seo_title,
      seo_description: record.seo_description,
      slug: record.slug,
      og_title: record.og_title,
      og_description: record.og_description,
      og_type: record.og_type,
      keywords: record.keywords,
    };

    const product = await this.productService.create(createProductDto);

    if (!product) {
      throw `Не удалось добавить новый товар`;
    }

    if (record.categories) {
      const category_id = await this.resolveCategory(record.categories);
      if (category_id) await this.productService.update(product.id, { category_id });
    }

    if (record.price && product && product.id) {
      const priceTypes = await this.priceTypeService.getAll();

      for (let i = 0; i < priceTypes.length; i++) {
        await this.productPriceService.create({
          product_id: product.id,
          price_type_id: priceTypes[i].id,
          price: record.price,
        });
      }
    }

    const specifications = Array.isArray(record.specifications) ? record.specifications : [];

    for (let i = 0; i < specifications.length; i++) {
      const specification = specifications[i];

      if (!Object.hasOwn(specification, "name") || !Object.hasOwn(specification, "value")) continue;

      if (specification.name.length > 0 && specification.value.length > 0) {
        let findCreateSpecification = await this.specificationsService.findByName(
          specification.name,
        );

        if (!findCreateSpecification) {
          findCreateSpecification = await this.specificationsService.create({
            name: specification.name,
            type: "text",
          });
        }

        if (findCreateSpecification) {
          await this.productSpecificationService.create({
            product_id: product.id,
            specification_id: findCreateSpecification.id,
            value: specification.value,
          });
        }
      }
    }

    return product;
  }

  async resolveCategory(categories: RecordCategories): Promise<number | null> {
    let result: number | null = null;

    if (typeof categories !== "object") {
      return result;
    }

    const category_id =
      Object.hasOwn(categories, "category_id") &&
      typeof categories?.category_id === "number" &&
      categories?.category_id > 0
        ? categories?.category_id
        : null;

    const create_categories =
      Object.hasOwn(categories, "create_categories") && Array.isArray(categories?.create_categories)
        ? categories?.create_categories
        : [];

    if (category_id) {
      result = category_id;
    } else if (create_categories.length > 0) {
      const isValidChainCategory =
        await this.categoryService.validateCategoryChain(create_categories);

      if (isValidChainCategory) {
        let lastCreatedId: number | null = null;

        for (let i = 0; i < create_categories.length; i++) {
          const category = create_categories[i];

          const parentId =
            i === 0
              ? typeof category.parent_id === "number" && category.parent_id > 0
                ? category.parent_id
                : null
              : lastCreatedId;

          const parentChildren = await this.categoryService.getChildren(parentId, "admin");

          const newCategory = await this.categoryService.create({
            name: category.name.trim(),
            parent_id: parentId,
            position: parentChildren ? parentChildren.length + 1 : 1,
          });

          lastCreatedId = newCategory.id;
        }

        result = lastCreatedId;
      }
    }

    return result;
  }

  async checkImportItems(items: CheckImportItemDto[]): Promise<
    Record<
      number,
      {
        status: "empty" | "record" | "completed";
        product_id: number | null;
      }
    >
  > {
    const result: Record<
      number,
      {
        status: "empty" | "record" | "completed";
        product_id: number | null;
      }
    > = {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const value = item?.barcode?.trim() || item?.name?.trim();

      let status: "empty" | "record" | "completed" = "empty";
      let product_id: number | null = null;

      if (!value) {
        status = "empty";
      } else {
        const record = await this.productSourceRecordRepository.findOne({
          where: { value },
        });

        if (!record) {
          status = "empty";
        } else {
          const product = await this.productService.findByCode(item.barcode);

          product_id = product ? product.id : null;
          status = product ? "completed" : "record";
        }

        result[item.id] = { status, product_id };
      }
    }

    return result;
  }

  async saveGeneratedRecord(payload: SaveGeneratedRecordDto) {
    const record = await this.findRecord(payload.value);

    if (record) {
      await this.productSourceRecordRepository.update(record.id, payload).catch((error) => {
        throw `Не удалось обновить запись о товаре, ${error}`;
      });
      return await this.findRecord(payload.value);
    } else {
      const newRecord = await this.productSourceRecordRepository.save(payload).catch((error) => {
        throw `Не удалось сохранить запись товара, ${error}`;
      });

      return newRecord;
    }
  }

  async findRecord(value: string) {
    return this.productSourceRecordRepository
      .findOne({
        where: { value },
      })
      .catch((error) => {
        throw `Не удалось получить запись ${error}`;
      });
  }
}
