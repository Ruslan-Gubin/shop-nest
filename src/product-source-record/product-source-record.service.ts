import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpenCodeService } from "src/opencode/opencode.service";
import { BrowserManagerService } from "src/browser-manager/browser-manager.service";
import { ProductSourceRecord } from "./entities/product-source-record.entity";
import { ProductService } from "src/product/product.service";
import { CreateProductDto } from "src/product/dto/create-product.dto";
import { ProductPriceService } from "src/product-price/product-price.service";
import { PriceTypeService } from "src/price-type/price-type.service";
import { ProductSpecificationService } from "src/product-specification/product-specification.service";
import { SpecificationsService } from "src/specifications/specifications.service";
import { PhotoService } from "src/photo/photo.service";
import { CategoryService } from "src/category/category.service";
import * as cheerio from "cheerio";
import { CheckImportItemDto } from "./dto/check-import-items.dto";
import { CreateProductFromRecordDto } from "./dto/create-product-from-record.dto";
import { GenerateSeoDto } from "./dto/generate-seo.dto";
import { SuggestCategoryDto } from "./dto/suggest-category.dto";

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
    private readonly photoService: PhotoService,
    private readonly categoryService: CategoryService,
    private readonly openCode: OpenCodeService,
    private readonly browserManager: BrowserManagerService,
  ) {}

  async createProductFromRecord(payload: CreateProductFromRecordDto) {
    const record = await this.findRecord(payload.barcode);

    if (!record) {
      throw `Не найдена запись для штрих-кода ${payload.barcode}. Сначала сгенерируйте данные о товаре`;
    }

    if (!record.product) {
      throw `Для штрих-кода ${payload.barcode} нет сгенерированных данных о товаре`;
    }

    const existingProduct = await this.productService.findByCode(payload.barcode);

    if (existingProduct) {
      throw `Товар с штрих-кодом ${payload.barcode} уже существует (ID: ${existingProduct.id})`;
    }

    const data = record.product as Record<string, unknown>;

    const asValidString = (data: object, key: string): string =>
      Object.hasOwn(data, key) && typeof data[key] === "string" ? data[key].trim() : "";

    const asValidNumber = (data: object, key: string): number =>
      Object.hasOwn(data, key) &&
      typeof data[key] === "number" &&
      data[key] > 0 &&
      !Number.isNaN(data[key])
        ? Math.ceil(data[key])
        : 0;

    const seo =
      Object.hasOwn(data, "seo") && typeof data.seo === "object" && data.seo !== null
        ? (data.seo as Record<string, unknown>)
        : {};

    const createProductDto: CreateProductDto = {
      category_id: 0,
      purchase_price: 0,
      name: record.clear_name.trim() || asValidString(data, "name") || `Товар ${payload.barcode}`,
      code: payload.barcode,
      description: asValidString(data, "description"),
      product_type: asValidString(data, "product_type"),
      equipment: asValidString(data, "equipment"),
      country: asValidString(data, "country"),
      brand_name: asValidString(data, "brand_name"),
      weight: asValidNumber(data, "weight"),
      height: asValidNumber(data, "height"),
      length: asValidNumber(data, "length"),
      width: asValidNumber(data, "width"),
      seo_title: asValidString(seo, "seo_title"),
      seo_description: asValidString(seo, "seo_description"),
      slug: asValidString(seo, "slug"),
      og_title: asValidString(seo, "og_title"),
      og_description: asValidString(seo, "og_description"),
      og_type: asValidString(seo, "og_type"),
      keywords: asValidString(seo, "keywords"),
    };

    const product = await this.productService.create(createProductDto);

    if (!product) {
      throw `Не удалось добавить новый товар`;
    }

    const category_path = asValidString(data, "category_name");

    if (category_path) {
      const category_id = await this.resolveCategory(product.name, category_path);
      if (category_id) await this.productService.update(product.id, { category_id });
    }

    const priceTypes = await this.priceTypeService.getAll();

    for (let i = 0; i < priceTypes.length; i++) {
      await this.productPriceService.create({
        product_id: product.id,
        price_type_id: priceTypes[i].id,
        price: Math.round(payload.price),
      });
    }

    const specifications = Array.isArray(data.specifications) ? data.specifications : [];

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

    if (Array.isArray(data.photos) && data.photos.length > 0) {
      for (let i = 0; i < data.photos.length; i++) {
        const url = data.photos[i];

        if (typeof url === "string" && url.length > 0 && url.match("http"))
          await this.photoService.create({ parent_id: product.id, parent_type: "product", url });
      }
    }

    return product;
  }

  async resolveCategory(productName: string, recommendedPath: string): Promise<number | null> {
    const categories = await this.categoryService.findAll();
    const categoriesTree = await this.categoryService.sortedCategories(categories);
    const categoriesForPrompt = this.formatCategoriesForPrompt(categoriesTree);

    const prompt = `
Товар: "${productName}"
Рекомендуемый путь категории: "${recommendedPath}"
СПИСОК СУЩЕСТВУЮЩИХ КАТЕГОРИЙ МАГАЗИНА:
${categoriesForPrompt}

Ты отвечаешь за порядок категорий и следишь, чтобы каждый товар лежал в подходящей для него категории интернет-магазина. Твоя задача — решить, в какую категорию отнести товар.
Внимательно изучи список существующих категорий и рекомендуемый путь. Главная задача — не плодить 1000 категорий: по возможности используй существующие.
Обрати внимание, что список категорий имеет актуальный отступ для визуального понимания расположения категорий и вложенности.

Правила:
- Если товару подходит существующая листовая категория — верни {"category_id": id, "create_categories": []}.
- Если подходящей категории нет — верни {"category_id": null, "create_categories": [...]}.
- Каждый элемент "create_categories" — объект {"name": "...", "parent_id": ...}.
- "parent_id" первого элемента массива может быть:
  * null — корневая категория (первый уровень),
  * id существующей родительской категории.
- Каждый следующий элемент массива — дочерняя категория предыдущего элемента (его "parent_id" игнорируется).
- Максимум 3-4 уровня вложенности от корня.
- Не создавай категории без необходимости: если товар можно отнести к существующей — используй существующую.
- Не выдумывай лишние уровни из рекомендуемого пути: бери только те, что нужны для точной категории.

Верни ТОЛЬКО JSON в виде {"category_id": 15, "create_categories": []} или {"category_id": null, "create_categories": [{"name": "Посуда", "parent_id": null}, {"name": "Чайники", "parent_id": 7}]}. Без пояснений, префиксов и markdown.

Примеры:
СПИСОК СУЩЕСТВУЮЩИХ КАТЕГОРИЙ МАГАЗИНА:
- id: 188, name: "Бижутерия"
  - id: 208, name: "Крабики"
- id: 189, name: "Шары"
  - id: 212, name: "Шары латексные"
- id: 166, name: "Канцтовары"
  - id: 196, name: "Тетради"
  - id: 197, name: "Ручки"
    - id: 213, name: "Ручка шариковая"
    - id: 229, name: "Ручка пишу стираю"
      - id: 230, name: "Ручка пишу стираю 1"
- id: 231, name: "Посуда"
  - id: 232, name: "Кастрюли"
    - id: 233, name: "Кастрюли алюминиевые"

Пример 1. Категория уже есть в списке.
Товар: Кастрюля алюминиевая KALITVA 3,5 л серебристый
Рекомендуемый путь категории: "Посуда / Для приготовления / Кастрюли / Алюминиевые"
Правило: категория для алюминиевой кастрюли уже существует — берём её id: 233. Создавать ничего не нужно, отметаем "Для приготовления" — это лишний уровень, стараемся делать меньше вложенности.
Ответ: {"category_id": 233, "create_categories": []}

Пример 2. Рекомендованный путь содержит похожую, но лишнюю листовую категорию.
Товар: Кастрюля алюминиевая Каструляки 5 л зеленая
Рекомендуемый путь категории: "Посуда / Кастрюли / Алюминиевый сплав"
Правило: категория Кастрюли алюминиевые уже существует — берём её id: 233. Не стоит создавать дополнительную категорию "Алюминиевый сплав" внутри "Кастрюли".
Ответ: {"category_id": 233, "create_categories": []}

Пример 3. Нужно создать одну новую листовую категорию в существующей родительской.
Товар: Кастрюля нержавейка AppleKastrula 10 л серая
Рекомендуемый путь категории: "Посуда / Кастрюли и ковши / Кастрюли из нержавейки"
Правило: "Кастрюли и ковши" нам не подходят, так как есть "Кастрюли" (id: 232). Категории "Кастрюли из нержавейки" нет — создаём её как дочернюю для "Кастрюли". Первый (и единственный) элемент массива получает parent_id: 232.
Ответ: {"category_id": null, "create_categories": [{"name": "Кастрюли из нержавейки", "parent_id": 232}]}

Пример 4. Нужно создать полностью новую ветку категорий.
Товар: Книга Школа семи гномов 2 серия
Рекомендуемый путь категории: "Книги / Детская литература / Обучение и развитие / Азбука, буквы, чтение"
Правило: сокращаем до "Обучение и развитие" (листовая категория). Если родительской категории "Книги" нет — полный путь в create_categories: первым идёт корневая с parent_id: null, следующие элементы — дети предыдущего (их parent_id можно ставить null).
Если же категория "Книги" существует (например id: 188), то первый элемент привязываем к ней.
Ответ (нет "Книги"): {"category_id": null, "create_categories": [{"name": "Книги", "parent_id": null}, {"name": "Детская литература", "parent_id": null}, {"name": "Обучение и развитие", "parent_id": null}]}
Ответ (есть "Книги" id: 188): {"category_id": null, "create_categories": [{"name": "Детская литература", "parent_id": 188}, {"name": "Обучение и развитие", "parent_id": null}]}
`;

    return await this.openCode
      .query(prompt)
      .then(async (response) => {
        const match = response.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : null;

        let result: number | null = null;

        if (!json || typeof json !== "object") {
          return result;
        }

        const category_id =
          Object.hasOwn(json, "category_id") &&
          typeof json?.category_id === "number" &&
          json?.category_id > 0
            ? json?.category_id
            : null;

        const create_categories =
          Object.hasOwn(json, "create_categories") && Array.isArray(json?.create_categories)
            ? json?.create_categories
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

              const parentChildren = await this.categoryService.getChildren(parentId);

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
      })
      .catch(() => null);
  }

  private formatCategoriesForPrompt(categories: any[], level = 0): string {
    let result = "";

    for (const category of categories) {
      const indent = "  ".repeat(level);
      result += `${indent}- id: ${category.id}, name: "${category.name}"\n`;

      if (category.children && category.children.length > 0) {
        result += this.formatCategoriesForPrompt(category.children, level + 1);
      }
    }

    return result;
  }

  async checkImportItems(items: CheckImportItemDto[]): Promise<
    Record<
      number,
      {
        status: "empty" | "error" | "record" | "completed";
        error_message: string;
        product_id: number | null;
      }
    >
  > {
    const result: Record<
      number,
      {
        status: "empty" | "error" | "record" | "completed";
        error_message: string;
        product_id: number | null;
      }
    > = {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const value = item?.barcode?.trim() || item?.name?.trim();

      let status: "empty" | "error" | "record" | "completed" = "error";
      let error_message = "";
      let product_id: number | null = null;

      if (!value) {
        error_message = "Нет названия и штрих-кода";
        status = "empty";
      } else {
        const record = await this.productSourceRecordRepository.findOne({ where: { value } });

        if (!record) {
          status = "empty";
        } else {
          if (Object.hasOwn(record, "product") && !record.product) {
            error_message = record.error_message ? record.error_message : "Нет полного описания";
            status = "error";
          } else {
            const product = await this.productService.findByCode(item.barcode);

            error_message = product ? "" : record.error_message ? record.error_message : "";
            product_id = product ? product.id : null;
            status = product ? "completed" : "record";
          }
        }

        result[item.id] = { status, error_message, product_id };
      }
    }

    return result;
  }

  async search(name: string, code: string) {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      throw "Укажите штрих-код";
    }

    if (!/^\d{8,14}$/.test(trimmedCode)) {
      throw "Некорректный штрих-код. Для товаров без кода заполните данные вручную";
    }

    const existing = await this.findRecord(trimmedCode);

    const source_names = existing?.source_names || [];
    let clear_name = existing?.clear_name || "";
    let product = existing?.product || null;
    let error_message = existing?.error_message || "";

    if (!existing) {
      const result = await this.findAndFormattedProductName(trimmedName, trimmedCode);

      if (result.source_names.length > 0) {
        source_names.push(...result.source_names);
      }

      if (result.clear_name.length > 0) {
        clear_name = result.clear_name;
      }

      if (result.error.length > 0) {
        error_message = result.error;
      }
    }

    if (!clear_name) {
      error_message = "Не удалось сформировать название для товара";
    }

    const validProductOptions =
      product !== null &&
      (Object.hasOwn(product, "name") ||
        Object.hasOwn(product, "code") ||
        Object.hasOwn(product, "description"));

    if (!validProductOptions) {
      const productInfo = await this.getProductInfo(clear_name, trimmedCode);
      const productOptions = await this.getProductOptions(clear_name, productInfo, trimmedCode);

      const validOptions =
        productOptions &&
        !Object.hasOwn(productOptions, "error") &&
        (Object.hasOwn(productOptions, "name") ||
          Object.hasOwn(productOptions, "code") ||
          Object.hasOwn(productOptions, "description"));

      const hasError =
        productOptions &&
        Object.hasOwn(productOptions, "error") &&
        typeof productOptions.error === "string";

      if (validOptions) {
        product = productOptions;
      } else if (hasError) error_message += productOptions.error;
    }

    if (clear_name && product) {
      error_message = "";
    }

    if (!existing) {
      await this.saveRecord(trimmedCode, source_names, clear_name, error_message, product);
    }

    if (existing && existing.error_message !== error_message) {
      await this.productSourceRecordRepository.update(existing.id, { error_message });
    }

    if (existing && !existing.product && product) {
      await this.productSourceRecordRepository.update(existing.id, { product, error_message: "" });
    }

    return { clear_name, product, error_message };
  }

  async fetchWithPlaywright(url: string) {
    const context = await this.browserManager.newContext();
    const page = await context.newPage();

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const photos: string[] = [];

    page.on("response", (res) => {
      const url = res.url();
      if (!url.match(/\.(jpg|jpeg|png|webp|avif)/i)) return;
      const contentType = res.headers()["content-type"] || "";
      if (contentType.includes("image")) photos.push(url);
    });

    try {
      await page.goto(url, { waitUntil: "load" });

      await page.evaluate(() => {
        const total = document.body.scrollHeight;
        const step = 300;
        let scrolled = 0;

        const interval = setInterval(
          () => {
            scrolled += step;
            window.scrollTo(0, scrolled);
            if (scrolled >= total) clearInterval(interval);
          },
          200 + Math.random() * 400,
        );
      });

      await sleep(2000 + Math.random() * 3000);

      const text = await page
        .evaluate(() => document.body?.innerText || "")
        .then((response) => {
          return response
            .replace(/Подтвердите, что вы не робот/gi, "")
            .replace(/Инцидент: fab_chlg_.*/gi, "")
            .replace(/©\s*\d{4}-?\d{0,4}.*/gi, "")
            .replace(/Все права защищены/gi, "")
            .replace(/Политика конфиденциальности/gi, "")
            .replace(/Условия использования/gi, "")
            .replace(/Правила сайта/gi, "")
            .replace(/Главная\s*›\s*[^\n]*/gi, "")
            .replace(/Каталог\s*:\s*[^\n]*/gi, "")
            .replace(/Меню\s*:[^\n]*/gi, "")
            .replace(/Похожие товары[:\n]?[\s\S]*?(?=\n\n|$)/gi, "")
            .replace(/Рекомендуем[:\n]?[\s\S]*?(?=\n\n|$)/gi, "")
            .replace(/С этим покупают[:\n]?[\s\S]*?(?=\n\n|$)/gi, "")
            .replace(/Цена:\s*\d+\s*(?:руб\.?|₽)?/gi, "")
            .replace(/В корзину/gi, "")
            .replace(/Купить в 1 клик/gi, "")
            .replace(/Добавить в избранное/gi, "")
            .replace(/\n\s*\n/g, "\n")
            .replace(/\s+/g, " ")
            .trim();
        });

      return { text, photos };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async asyncPool<T>(
    concurrency: number,
    items: T[],
    fn: (item: T) => Promise<void>,
  ): Promise<void> {
    const executing = new Set<Promise<void>>();
    for (const item of items) {
      const promise = fn(item).finally(() => executing.delete(promise));
      executing.add(promise);
      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
  }

  async pickImages(query: string): Promise<string[]> {
    const headers = {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://duckduckgo.com/",
    };

    const tokenPage = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers },
    );
    const tokenHtml = await tokenPage.text();

    const vqd = tokenHtml.match(/vqd="([^"]+)"/)?.[1];
    if (!vqd) return [];

    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
      query,
    )}&vqd=${vqd}&p=1`;

    const apiResponse = await fetch(apiUrl, { headers });
    if (!apiResponse.ok) return [];

    const data: {
      results?: {
        image?: string;
        title?: string;
        width?: number;
        height?: number;
        score?: number;
        small?: boolean;
      }[];
    } = await apiResponse.json();

    for (const result of data.results || []) {
      result.score = this.scoreTitle(result.title || "", query);
      result.small = (result.width || 0) < 200 || (result.height || 0) < 200;
    }

    return (data.results || [])
      .sort((a, b) => {
        if (!a.image && !b.image) return 0;
        if (!a.image) return 1;
        if (!b.image) return -1;
        return Number(a.small) - Number(b.small) || b.score! - a.score!;
      })
      .slice(0, 50)
      .map((result) => result.image)
      .filter((url): url is string => !!url);
  }

  private scoreTitle(title: string, name: string): number {
    const tokenize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-zа-яё0-9.]+/gi, " ")
        .split(/\s+/)
        .filter(Boolean);

    const stemToken = (token: string): string =>
      token.replace(
        /(ая|яя|ое|ее|ый|ий|ой|ого|его|ому|ему|ам|ям|ах|ях|ов|ев|ом|ем|а|я|ы|и|у|ю|о|е|ь)$/gi,
        "",
      );

    const stem = (tokens: string[]): string[] =>
      tokens.map((t) => (t.length >= 3 ? stemToken(t) : t));

    const nameTokens = tokenize(name);
    const nameStemmed = stem(nameTokens);
    const titleTokens = tokenize(title);
    const titleStemmed = stem(titleTokens);

    if (nameTokens.length === 0) return 0;

    const nameNumbers = new Set(nameTokens.filter((t) => /\d/.test(t)));
    let score = 0;

    for (let i = 0; i < nameTokens.length; i++) {
      const token = nameTokens[i];
      const stemmed = nameStemmed[i];
      const isNumeric = /\d/.test(token);

      if (isNumeric) {
        if (titleTokens.includes(token)) score += 1;
        continue;
      }

      if (titleStemmed.includes(stemmed)) {
        score += 2;
      } else if (titleStemmed.some((t) => t.includes(stemmed) || stemmed.includes(t))) {
        score += 1;
      }
    }

    for (const titleToken of titleTokens) {
      if (/\d/.test(titleToken) && !nameNumbers.has(titleToken)) {
        score -= 1;
      }
    }

    return score;
  }

  async getProductInfo(name: string, barcode?: string) {
    const query = `купить - ${name ? "Название товара " + name + "," : ""} ${barcode ? "Штрих-код:" + barcode : ""}`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=10`;

    const urls: string[] = [];

    try {
      const response = await fetch(searchUrl);
      const html = await response.text();

      const $ = cheerio.load(html);

      $("a.result__a").each((i, element) => {
        if (i >= 10) return false;
        const link = $(element).attr("href");
        const urlObj = new URL(`https:${link}`);
        const encoded = urlObj.searchParams.get("uddg");

        if (encoded) {
          const decodedUrl = decodeURIComponent(encoded);
          urls.push(decodedUrl);
        }
      });

      const data: { url: string; data: any; error: string; photos: string[] }[] = [];

      await this.asyncPool(2, urls, async (url) => {
        try {
          const { text, photos } = await this.fetchWithPlaywright(url);

          if (text.length > 0) {
            const validateText = await this.validateParseProductInfo(text, name, photos, barcode);

            if (
              (validateText.data.length > 0 && validateText.error.length === 0) ||
              (validateText.error.length > 0 && validateText.photos.length > 0)
            ) {
              data.push({
                url,
                data: validateText.data,
                error: validateText.error,
                photos: validateText.photos,
              });
            }
          }
        } catch (error) {
          data.push({ url, data: "", error: `playwright: ${error}`, photos: [] });
        }
      });

      return data;
    } catch (error) {
      throw `Ошибка при поиске списка: ${error}`;
    }
  }

  async validateParseProductInfo(
    rawText: string,
    expectedName: string,
    photos: string[],
    barcode?: string,
  ): Promise<{ data: string; error: string; photos: string[] }> {
    const validAnswer = `{"data": "полезная информация о товаре (кратко, без шума), или пустая строка, если не товар", "error": "короткая причина, если это не товар / ошибка / нет данных", "photos": ["ссылка1", "ссылка2"]}`;

    const prompt = `
Ты — эксперт и экстрактор данных о товарах.

Входные ориентиры:
- Ожидаемое название товара: ${expectedName}
- Штрихкод: ${barcode ? barcode : "Отсутствует"}
- Список фото: ${JSON.stringify(photos)}

Твоя задача:
1. Определить, содержит ли приведённый текст актуальные данные о конкретном товаре или имеет что то общее с ожидаемым товаром.
2. Если это НЕ карточка товара (страница поиска, справочник, сервис, ошибка, капча, страница авторизации, заглушка «сайт заблокирован», «нет соединения» и т.п.) — верни JSON с пустой строкой в "data" и краткой причиной в "error".
3. Если это карточка товара и есть полезная информация — JSON в поле "data" верни всю информацию которая может относится к товару: название/бренд/модель, ключевые характеристики, особенности, габариты, производитель, и прочая информация которая может быть связанна с данным товаров. Не включай доставку, оплату, гарантии, кнопки, призывы к действию, цены других товаров, списки аналогов.
4. Из списка фото оставь ТОЛЬКО те ссылки, которые относятся к какому либо товару (фото товара, варианты цвета, крупные планы деталей). Удали: логотипы брендов/магазинов, баннеры, заглушки (например, «фото в процессе загрузки»), иконки, капчи, скриншоты интерфейса, «похожие товары», рекламные слайдеры, любые изображения, где товара не видно.
5. Если фото нет или все фото нерелевантны — "photos": [].
6. Если данные противоречивы или невозможно понять, о каком товаре речь — в JSON "error" укажи причину, а "data" оставь пустым.

Правила ответа:
- Верни ТОЛЬКО JSON в виде ${validAnswer}
- Никаких префиксов, пояснений, списков, нумерации, markdown-блоков
- Не предлагай варианты, не задавай вопросы
- Если невозможно извлечь полезную информацию о товаре — "data": "", а в "error" кратко укажи причину

Примеры:
Вход: [текст страницы с капча и «Подтвердите, что вы не робот»]
Ответ: {"data": "", "error": "Страница содержит капча, не карточка товара", "photos": []}

Вход: [текст с описанием подшипника 3524, размерами, весом]
Ответ: {"data": "Подшипник 3524, радиальный роликовый сферический, внутренний диаметр 120 мм, внешний 215 мм, высота 58 мм, латунный сепаратор", "error": "", "photos": ["ссылка_на_вилку", "ссылка_на_упаковку"]}

Вход: [пустой текст]
Ответ: {"data": "", "error": "Ошибка: пустой текст страницы", "photos": []}

Текст страницы: ${rawText}
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);

        const json = match ? JSON.parse(match[0]) : null;

        return {
          data:
            json && Object.hasOwn(json, "data") && typeof json.data === "string" ? json.data : "",
          error:
            json && Object.hasOwn(json, "error") && typeof json.error === "string"
              ? json.error
              : "",
          photos:
            json && Object.hasOwn(json, "photos") && Array.isArray(json.photos) ? json.photos : [],
        };
      })
      .catch((error) => {
        return {
          data: "",
          error: `Ошибка вызова LLM: ${error instanceof Error ? error.message : String(error)}`,
          photos: [],
        };
      });
  }

  async findAndFormattedProductName(name: string, code: string) {
    const source_names: string[] = [];

    await this.getEanNames(code, source_names);
    await this.getDisaiNames(code, source_names);
    await this.getBarcodeNames(code, source_names);
    await this.getYandexNames(code, source_names);

    if (name.length > 0 && source_names.length === 0) {
      await this.formattedName(name, source_names);
    }

    if (source_names.length === 0) {
      throw "По данному штрих-коду не удалось найти название товара. Укажите другое название товара или измените название";
    }

    let clear_name = "";
    let error = "";

    const generateName = await this.determineName(source_names);

    if (generateName && generateName.name.length > 0) {
      clear_name = generateName.name;
    }

    if (generateName && generateName.error.length > 0) {
      error = generateName.error;
    }

    return { source_names, clear_name, error };
  }

  async getEanNames(code: string, names: string[]) {
    const response = await fetch("https://ean-online.ru/match.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://ean-online.ru/",
        "User-Agent": "Mozilla/5.0 ...",
      },
      body: `barcode=${code}`,
    });

    const name = await response.text();

    if (name) {
      names.push(name);
    }
  }

  async getDisaiNames(code: string, names: string[]) {
    const response = await fetch(`https://ru.disai.org/?search_query=${code}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $("tr[bgcolor='#e0e8f2']").each((_, row) => {
      const items: string[] = [];

      $(row)
        .find("td:first-child font")
        .contents()
        .each((_, node) => {
          if (node.type === "text") {
            const text = $(node).text().trim();
            if (text) items.push(text);
          }
        });

      items.forEach((name) => {
        names.push(name);
      });
    });
  }

  async getBarcodeNames(barcode: string, names: string[]) {
    const response = await fetch(
      `https://barcode-list.ru/barcode/RU/Поиск.htm?barcode=${barcode}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    const html = await response.text();
    const $ = cheerio.load(html);

    $("table.randomBarcodes tr.even, table.randomBarcodes tr.odd").each((_, row) => {
      const name = $(row).find("td:nth-child(3)").text().trim();
      if (name) {
        names.push(name);
      }
    });
  }

  async getYandexNames(code: string, names: string[]) {
    const response = await fetch(`https://market.yandex.ru/search?text=${code}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      const json = JSON.parse($(el).html() ?? "");
      if (json.itemListElement) {
        json.itemListElement.forEach((item: any) => {
          const name = item.item?.name?.trim();
          if (name) {
            names.push(name);
          }
        });
      }
    });
  }

  async determineName(names: string[]): Promise<{ name: string; error: string }> {
    if (names.length === 0) return { name: "", error: "Нет названий для товара" };

    const validAnswer = `"{ "name": "Название товара", "error": "если не удалось сформировать название - Ошибка: причина коротко" }"`;

    const prompt = `
Есть список названий товара из разных источников: ${JSON.stringify(names)}
Приведи к единственному нормально отформатированному чистому названию для интернет-магазина.
Удали лишнее, приведи к нормальному регистру и проверь орфографию.
Верни JSON в виде ${validAnswer},
если каким-то образом не получилось извлечь из списка корректное название тогда возвращай ${validAnswer} в error коротко опиши причину.

Правила ответа:
- Верни ТОЛЬКО JSON в виде ${validAnswer}
- Никаких кавычек, префиксов, пояснений, списков, нумерации
- Если невозможно определить единое название — ответь ровно JSON в виде ${validAnswer}
- Если названия противоречивые или невозможно определить — JSON в виде ${validAnswer}
- Не предлагай варианты, не задавай вопросы
- Важно ответ должен быть JSON в виде ${validAnswer} второго варианта не должно быть

Примеры:
Вход: ["лампа светодиодная in home 30W 4000K", "IN HOME LED 30W 4000K E27"] 
Ответ: "{"name":"Лампа светодиодная IN HOME 30Вт 4000K E27", "error": ""}"

Вход: [""]
Ответ: "{"name":"", "error": "Ошибка: нет названий для товара"}"
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : null;

        return {
          name: json && Object.hasOwn(json, "name") ? json?.name : "",
          error:
            json && Object.hasOwn(json, "error")
              ? json.error
              : json && !Object.hasOwn(json, "name")
                ? "Не удалось сгенерировать название для товара"
                : "",
        };
      })
      .catch((error) => {
        return {
          name: "",
          error: `Ошибка вызова LLM: ${error instanceof Error ? error.message : String(error)}`,
        };
      });
  }

  async formattedName(name: string, names: string[]) {
    if (name.length === 0) return "";

    const prompt = `
Есть произвольное название товара: ${name}
Приведи название к нормально отформатированному чистому названию для интернет-магазина.
Удали лишнее, приведи к нормальному регистру и проверь орфографию.
Верни только JSON в виде "{ "name": "отформатированное название" }", без пояснений и раздумий, без JSON ответ не корректный
если каким-то образом не получилось составить корректное название тогда возвращай JSON в виде "{ "name": "" }".

Правила ответа:
- Верни ТОЛЬКО один JSON — "{ "name": "отформатированное название" }"
- Никаких кавычек, префиксов, пояснений, списков, нумерации
- Если невозможно определить название для товара — ответь JSON "{ "name": "" }"
- Если названия противоречивые или невозможно определить — JSON "{ "name": "" }"
- Не предлагай варианты, не задавай вопросы
- Важно ответ должен быть с JSON без JSON ответ не корректный

Примеры:
Вход: "E27 лампа светодиодная in home 30W 4000K" 
Ответ: "{ "name": "Лампа светодиодная IN HOME 30Вт 4000K E27" }"

Вход: [""]
Ответ: "{ "name": "" }"
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : null;

        const currentName =
          json && Object.hasOwn(json, "name") && json?.name?.length > 0 ? json?.name : "";

        if (currentName.length > 0) {
          names.push(currentName);
        }

        return currentName;
      })
      .catch(() => "");
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

  async saveRecord(
    value: string,
    source_names: string[],
    clear_name: string,
    error_message: string,
    product?: object | null,
  ) {
    return this.productSourceRecordRepository.save({
      value,
      source_names,
      clear_name,
      product,
      error_message,
    });
  }

  async getProductOptions(
    name: string,
    productInfo: { url: string; data: any; error: string; photos: string[] }[],
    barcode: string,
  ): Promise<{ error?: string; name?: string; code?: string } | null> {
    const allPhotos = [...new Set(productInfo.flatMap((p) => p.photos))].filter((url) => {
      if (url.includes("abt-challenge")) return false;
      if (url.includes("yastatic.net") || url.includes("favicon")) return false;
      if (url.includes("spritesheet") || url.includes("specials-bg") || url.includes("xarus-logo"))
        return false;
      if (url.includes("replain.cc") || url.includes("404")) return false;
      if (url.includes("imgtmb") || url.includes("countries_flags")) return false;
      if (url.match(/\/\d{1,2}x\d{1,2}\//)) return false;
      if (url.match(/\/60_60_/)) return false;
      return true;
    });

    const formattedInfo =
      productInfo
        .map((p, i) => {
          let text = `\n=== Источник ${i + 1}: ${p.url} ===\n`;
          if (p.error) text += `Ошибка: ${p.error}\n`;
          if (p.data) {
            const clean = p.data.replace(/\s+/g, " ").trim();
            text += clean.substring(0, 5000);
          }
          return text;
        })
        .join("\n\n") +
      `\n\n=== ФОТОГРАФИИ ТОВАРА (предварительно отфильтрованы) ===\n` +
      allPhotos.join("\n");

    const prompt = `Товар с названием "${name}", 
    И то что удалось извлечь из интернета (все данные по этому товару) - ${formattedInfo}
    Ты — менеджер по продажам в крупной компании. Твоя задача — дать официальное, формализованное описание товара.
    Твоя задача извлечь структурированных полей и  дать официальное, формализованное описание товара, исходя из информации составить json такого вида -
    {
      "description": "Описание товара (5-6 предложений, официальный стиль, с деталями и нюансами)" или null,
      "product_type": "Вид товара (например \"Кукла-пупс\", \"Тетрадь\")" или null,
      "equipment": "Комплектация (что входит в набор)" или null,
      "brand_name": "Бренд" или null,
      "name": название товара,
      "code": штриховой код товара - ${barcode},
      "category_name": "Полный путь до листовой категории (например \"Игрушки / Куклы / Кукла-пупс\" или \"Посуда / Чайники / Эмалированные чайники\")" или null,
      "specifications": [
        { "name": "Название характеристики", "value": "Значение" }
      ] или null,
      "weight": число (вес в граммах) или null,
      "height": число (высота в см) или null,
      "length": число (длина в см) или null,
      "width": число (ширина в см) или null,
      "country": "Страна производства" или null,
      "seo": {
        "seo_title": "Meta-заголовок (до 60 символов, с ключевыми словами)",
        "seo_description": "Meta-описание (до 160 символов, с ключевыми словами)",
        "slug": "ЧПУ-строка (транслит, только латиница, дефисы вместо пробелов, без спецсимволов)",
        "og_title": "Open Graph заголовок (до 60 символов)",
        "og_description": "Open Graph описание (до 160 символов)",
        "og_type": "Тип Open Graph (обычно 'product')",
        "keywords": "Ключевые слова через запятую (5-10 слов)"
      } или null,
      "photos": [] массив ссылок на фото товара (желательно без иконок, логотипов, баннеров, фонов, аватаров отзывов)
    }

    ВАЖНО:
    - В поле "photos" укажи ТОЛЬКО ссылки
    - верни ТОЛЬКО JSON без пояснений
    - В результирующем JSON должна быть информация переданная по этому товару, выдуманной информации не должно быть, 
    - Не добавляй что ли бо от себя и не выдумывай если описание тебе показалось не корректным
    - Только информация о товаре, не надо объяснять что либо спрашивать или советоваться, если по какому либо полю нет данных просто ставь null
    Пример ответа: "{
      "name": "Mary Poppins кукла Полли «Милый болтун», 33см, озвучка",
      "code": ${barcode},
      "description": "Очаровательный пупс Полли из коллекции Mary Poppins. Высота 33 см, мягконабивное тело с твёрдыми ручками и ножками. Кукла издаёт 5 реалистичных звуков: плачет, хохочет, лепечет, агукает и говорит «папа».",
      "product_type": "Кукла-пупс",
      "equipment": "Кукла, бутылочка-поильник, 3 батарейки AG13, шапочка",
      "brand_name": "Mary Poppins",
      "category_name": "Игрушки / Куклы / Кукла-пупс",
      "country": "Китай",
      "weight": 580,
      "height": 33,
      "length": null,
      "width": null,
      "specifications": [
        { "name": "Материал", "value": "ПВХ, пластик, текстильные материалы" },
        { "name": "Тип тела", "value": "Мягконабивное" },
        { "name": "Звуковые эффекты", "value": "5 звуков" },
        { "name": "Питание", "value": "3×AG13/LR44" },
        { "name": "Возраст", "value": "от 3 лет" },
        { "name": "Артикул", "value": "451193" }
      ],
      "photos": [
        "https://polesie-toys.com/upload/iblock/451193/box.jpg",
        "https://polesie-toys.com/upload/iblock/451193/doll_1.jpg",
        "https://polesie-toys.com/upload/iblock/451193/doll_2.jpg",
        "https://ozon.ru/photos/451193_1.jpg",
        "https://ozon.ru/photos/451193_2.jpg"
      ],
      "seo": {
        "seo_title": "Кукла Mary Poppins Полли «Милый болтун» 33см озвучка",
        "seo_description": "Пупс Mary Poppins Полли 33 см с 5 звуками. Мягконабивное тело, съёмная одежда. Игрушка для детей от 3 лет.",
        "slug": "kukla-mary-poppins-polli-milyj-boltun-33sm-ozvuchka",
        "og_title": "Кукла Mary Poppins Полли «Милый болтун» 33см",
        "og_description": "Очаровательный пупс Полли из коллекции Mary Poppins. Высота 33 см, 5 реалистичных звуков.",
        "og_type": "product",
        "keywords": "Mary Poppins, кукла, Полли, милый болтун, пупс, озвучка, 33см, детские игрушки"
      }
    }"
    Правила ответа:
    - Если данных для поля нет — ставь null.
    - Не придумывай от себя ничего, чего нет в описании.
    - Верни ТОЛЬКО JSON — полноценное описание
    - Никаких кавычек, префиксов, пояснений, списков, нумерации
    - Если невозможно определить описание товара по каким либо причинам — ответь JSON "{"error": "Ошибка: ( причина коротко )"}"
    - Если описания противоречивые или невозможно определить общее описание — верни: JSON "{"error": "Ошибка: ( причина коротко )"}"
    - Не предлагай варианты, не задавай вопросы, не фантазируй
    - Важно ответ должен быть или JSON товара или ответь JSON "{"error": "Ошибка: ( причина коротко )"}", третьего варианта не должно быть
    - всякого рода кавычек и приписок по типу json мне не нужны, желательно структуру JSON в противном ответь JSON "{"error": "Ошибка: ( причина коротко )"}"
    - если источники содержат разную информацию по разным товарам попробуй найти более подходящий источник для названия ${name} или штрих-кода: ${barcode} или же найди какое либо сходство из разных источников и составь минимальное описание, если нет определенного бренда или габариты не сопоставляются из разных источников тогда необязательно это указывать пусть буде null
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
      })
      .catch(() => null);
  }

  async generateSeo(dto: GenerateSeoDto) {
    const seo = dto.seo || {};

    const validAnswer = `{
      "seo_title": "Meta-заголовок (до 60 символов, с ключевыми словами)",
      "seo_description": "Meta-описание (до 160 символов, с ключевыми словами)",
      "slug": "ЧПУ-строка (транслит, только латиница, дефисы вместо пробелов, без спецсимволов)",
      "og_title": "Open Graph заголовок (до 60 символов)",
      "og_description": "Open Graph описание (до 160 символов)",
      "og_type": "Тип Open Graph (обычно 'product')",
      "keywords": "Ключевые слова через запятую (5-10 слов)"
    }`;

    const prompt = `
Ты — SEO-специалист интернет-магазина. Твоя задача — сформировать рекомендуемые SEO-поля для карточки товара.

Входные данные о товаре:
- Название: ${dto.name}
- Описание: ${dto.description ? dto.description : "Отсутствует"}
- Бренд: ${dto.brand_name ? dto.brand_name : "Отсутствует"}
- Категория: ${dto.category_name ? dto.category_name : "Отсутствует"}
- Текущие SEO-поля товара (могут быть заполнены или пустые):
${JSON.stringify(seo, null, 2)}

Твоя задача:
1. Для каждого SEO-поля дай рекомендуемое значение.
2. Если поле уже заполнено осмысленным значением — сохрани его, улучшив при необходимости.
3. Если поле пустое — сгенерируй рекомендуемое значение на основе названия, описания, бренда и категории.
4. "seo_title" — до 60 символов, с ключевыми словами.
5. "seo_description" — до 160 символов, с ключевыми словами.
6. "slug" — транслит латиницей, дефисы вместо пробелов, без спецсимволов, строчные буквы.
7. "og_title" — до 60 символов, "og_description" — до 160 символов.
8. "og_type" — обычно "product".
9. "keywords" — 5-10 ключевых слов через запятую.

Правила ответа:
- Верни ТОЛЬКО JSON в виде ${validAnswer}
- Никаких префиксов, пояснений, списков, нумерации, markdown-блоков
- Не выдумывай факты о товаре, которых нет во входных данных
- Если невозможно сформировать SEO — верни JSON с пустыми строками
`;

    return await this.openCode
      .query(prompt)
      .then((response) => {
        const match = response.match(/\{[\s\S]*\}/);
        const json = match ? JSON.parse(match[0]) : null;

        if (!json || typeof json !== "object") return null;

        return {
          seo_title: Object.hasOwn(json, "seo_title") ? json.seo_title : "",
          seo_description: Object.hasOwn(json, "seo_description") ? json.seo_description : "",
          slug: Object.hasOwn(json, "slug") ? json.slug : "",
          og_title: Object.hasOwn(json, "og_title") ? json.og_title : "",
          og_description: Object.hasOwn(json, "og_description") ? json.og_description : "",
          og_type: Object.hasOwn(json, "og_type") ? json.og_type : "",
          keywords: Object.hasOwn(json, "keywords") ? json.keywords : "",
        };
      })
      .catch((error) => {
        throw `Ошибка генерации SEO: ${error instanceof Error ? error.message : String(error)}`;
      });
  }

  async suggestCategory(payload: SuggestCategoryDto) {
    const categories = await this.categoryService.findAll();
    const categoriesTree = await this.categoryService.sortedCategories(categories);
    const categoriesForPrompt = this.formatCategoriesForPrompt(categoriesTree);

    const prompt = `
Товар: "${payload.name}"
Описание товара: "${payload.description}"
СПИСОК СУЩЕСТВУЮЩИХ КАТЕГОРИЙ МАГАЗИНА:
${categoriesForPrompt}

Ты отвечаешь за порядок категорий и следишь, чтобы каждый товар лежал в подходящей для него категории интернет-магазина. Твоя задача — определить, в какую категорию отнести товар, опираясь на его название и описание.
Внимательно изучи список существующих категорий. Главная задача — не плодить 1000 категорий: по возможности используй существующие.
Обрати внимание, что список категорий имеет актуальный отступ для визуального понимания расположения категорий и вложенности.

Правила:
- Если товару подходит существующая листовая категория — верни {"category_id": id, "create_categories": []}.
- Если подходящей категории нет — верни {"category_id": null, "create_categories": [...]}.
- Каждый элемент "create_categories" — объект {"name": "...", "parent_id": ...}.
- "parent_id" первого элемента массива может быть:
  * null — корневая категория (первый уровень),
  * id существующей родительской категории.
- Каждый следующий элемент массива — дочерняя категория предыдущего элемента (его "parent_id" игнорируется).
- Максимум 3-4 уровня вложенности от корня.
- Не создавай категории без необходимости: если товар можно отнести к существующей — используй существующую.
- Используй описание товара только для уточнения подходящей категории, не выдумывай лишние уровни вложенности.
- Рекомендуется не хранить товары в корневой категории а создавать разветвление для корневого каталога.

Верни ТОЛЬКО JSON в виде {"category_id": 15, "create_categories": []} или {"category_id": null, "create_categories": [{"name": "Посуда", "parent_id":   если это корневая категория тогда null иначе id родительской категории}, {"name": "Чайники", "parent_id": null}]}. Без пояснений, префиксов и markdown.

Примеры:
СПИСОК СУЩЕСТВУЮЩИХ КАТЕГОРИЙ МАГАЗИНА:
- id: 188, name: "Бижутерия"
  - id: 208, name: "Крабики"
- id: 189, name: "Шары"
  - id: 212, name: "Шары латексные"
- id: 166, name: "Канцтовары"
  - id: 196, name: "Тетради"
  - id: 197, name: "Ручки"
    - id: 213, name: "Ручка шариковая"
    - id: 229, name: "Ручка пишу стираю"
      - id: 230, name: "Ручка пишу стираю 1"
- id: 231, name: "Посуда"
  - id: 232, name: "Кастрюли"
    - id: 233, name: "Кастрюли алюминиевые"

Пример 1. Категория уже есть в списке.
Товар: Кастрюля алюминиевая KALITVA 3,5 л серебристый
Описание товара: "Кастрюля из алюминия для приготовления пищи"
Правило: категория для алюминиевой кастрюли уже существует — берём её id: 233. Создавать ничего не нужно, стараемся делать меньше вложенности.
Ответ: {"category_id": 233, "create_categories": []}

Пример 2. Нужно создать одну новую листовую категорию в существующей родительской.
Товар: Кастрюля нержавейка AppleKastrula 10 л серая
Описание товара: "Кастрюля из нержавейки для приготовления пищи"
Правило: категории "Кастрюли из нержавейки" нет — создаём её как дочернюю для "Кастрюли" (id: 232). Первый (и единственный) элемент массива получает parent_id: 232.
Ответ: {"category_id": null, "create_categories": [{"name": "Кастрюли из нержавейки", "parent_id": 232}]}

Пример 3. Нужно создать полностью новую ветку категорий.
Товар: Книга Школа семи гномов 2 серия
Описание товара: "Обучающая детская литература для чтения, азбука и буквы"
Правило: сокращаем до "Обучение и развитие" (листовая категория). Если родительской категории "Книги" нет — полный путь в create_categories: первым идёт корневая с parent_id: null, следующие элементы — дети предыдущего (их parent_id нужно ставить null).
Если же категория "Книги" существует (например id: 188), то первый элемент привязываем к ней.
Ответ (нет "Книги"): {"category_id": null, "create_categories": [{"name": "Книги", "parent_id": null}, {"name": "Детская литература", "parent_id": null}, {"name": "Обучение и развитие", "parent_id": null}]}
Ответ (есть "Книги" id: 188): {"category_id": null, "create_categories": [{"name": "Детская литература", "parent_id": 188}, {"name": "Обучение и развитие", "parent_id": null}]}

Пример 4. Не желательно присваивать корневую категорию как category_id.
Товар: Вентилятор напольный мощный для дома
Описание товара: "Напольный вентилятор — надёжный и эффективный помощник для охлаждения дома и офиса в жаркое время года. Мощный двигатель 70 Вт обеспечивает стабильную циркуляцию воздуха и создаёт комфортный освежающий поток. Классическая конструкция с пятью лопастями формирует мягкий и равномерный обдув, помогая быстро охладить помещение."
Правило: видно что товар можно добавить в имеющую категорию 241 "Бытовая техника", но категория 241 корневая и имеет parent_id: null, желательно от корневой категории добавить ответвление
Ответ: {"category_id": null, "create_categories": [{"name": "Вентиляторы", "parent_id": 241}]}
`;

    return await this.openCode.query(prompt).then(async (response) => {
      const match = response.match(/\{[\s\S]*\}/);
      const json = match ? JSON.parse(match[0]) : null;

      const category_id =
        json &&
        Object.hasOwn(json, "category_id") &&
        typeof json?.category_id === "number" &&
        json?.category_id > 0
          ? json?.category_id
          : null;

      const create_categories =
        json && Object.hasOwn(json, "create_categories") && Array.isArray(json?.create_categories)
          ? json?.create_categories
          : [];

      return { category_id, create_categories };
    });
  }

  async applySuggestCategory(create_categories: { name: string; parent_id: number | null }[]) {
    const isValidChainCategory =
      await this.categoryService.validateCategoryChain(create_categories);

    if (!isValidChainCategory) {
      throw "Не удалось добавить категорию, не валидный список категорий";
    }

    let lastCreatedId: number | null = null;

    for (let i = 0; i < create_categories.length; i++) {
      const category = create_categories[i];

      const parentId =
        i === 0
          ? typeof category.parent_id === "number" && category.parent_id > 0
            ? category.parent_id
            : null
          : lastCreatedId;

      const parentChildren = await this.categoryService.getChildren(parentId);

      const newCategory = await this.categoryService.create({
        name: category.name.trim(),
        parent_id: parentId,
        position: parentChildren ? parentChildren.length + 1 : 1,
      });

      lastCreatedId = newCategory.id;
    }

    return lastCreatedId;
  }
}
