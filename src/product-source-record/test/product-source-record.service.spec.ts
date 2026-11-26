import "reflect-metadata";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CategoryService } from "src/category/category.service";
import { PriceTypeService } from "src/price-type/price-type.service";
import { ProductPriceService } from "src/product-price/product-price.service";
import { ProductService } from "src/product/product.service";
import { ProductSpecificationService } from "src/product-specification/product-specification.service";
import { SpecificationsService } from "src/specifications/specifications.service";
import { ProductSourceRecord } from "../entities/product-source-record.entity";
import { ProductSourceRecordService } from "../product-source-record.service";

describe("product-source-record service", () => {
  let service: ProductSourceRecordService;

  const repository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };
  const productService = {
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const productPriceService = { create: jest.fn() };
  const priceTypeService = { getAll: jest.fn() };
  const productSpecificationService = { create: jest.fn() };
  const specificationsService = { findByName: jest.fn(), create: jest.fn() };
  const categoryService = {
    validateCategoryChain: jest.fn(),
    getChildren: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    // resetAllMocks сбрасывает и реализации: mockRejectedValue из прошлого теста
    // не должен протекать в следующие.
    jest.resetAllMocks();
    // Сервис вызывает .catch() на результате update/save, поэтому мок должен
    // возвращать промис даже для успешного сценария.
    repository.update.mockResolvedValue(undefined);
    repository.save.mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSourceRecordService,
        {
          provide: getRepositoryToken(ProductSourceRecord),
          useValue: repository,
        },
        { provide: ProductService, useValue: productService },
        { provide: ProductPriceService, useValue: productPriceService },
        { provide: PriceTypeService, useValue: priceTypeService },
        {
          provide: ProductSpecificationService,
          useValue: productSpecificationService,
        },
        { provide: SpecificationsService, useValue: specificationsService },
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compile();

    service = moduleRef.get(ProductSourceRecordService);
  });

  const makeRecord = (overrides: Partial<ProductSourceRecord> = {}): ProductSourceRecord => ({
    id: 7,
    value: "4606008629937",
    name: "Название товара",
    code: "4606008629937",
    brand_name: "Brand",
    description: "Описание",
    country: "Россия",
    product_type: "Тип",
    equipment: "Комплектация",
    weight: 1.5,
    height: 2,
    length: 3,
    width: 4,
    seo_title: "seo title",
    seo_description: "seo description",
    slug: "slug",
    og_title: "og title",
    og_description: "og description",
    og_type: "product",
    keywords: "keywords",
    price: 1000,
    specifications: [{ name: "Материал", value: "Хлопок" }],
    categories: { category_id: 5, create_categories: [] },
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
    ...overrides,
  });

  const makePayload = () => ({
    value: "4606008629937",
    name: "Название товара",
    description: "Описание",
    code: "4606008629937",
    product_type: "Тип",
    brand_name: "Brand",
    country: "Россия",
    equipment: "Комплектация",
    price: 1000,
    weight: 1.5,
    height: 2,
    length: 3,
    width: 4,
    seo_title: "seo title",
    seo_description: "seo description",
    slug: "slug",
    og_title: "og title",
    og_description: "og description",
    og_type: "product",
    keywords: "keywords",
    specifications: [{ name: "Материал", value: "Хлопок" }],
    categories: { category_id: 5, create_categories: [] },
  });

  describe("findRecord", () => {
    it("ищет запись по value и возвращает её", async () => {
      const record = makeRecord();
      repository.findOne.mockResolvedValue(record);

      const result = await service.findRecord("4606008629937");

      expect(result).toEqual(record);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { value: "4606008629937" },
      });
    });

    it("возвращает null, когда записи нет", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findRecord("отсутствует")).resolves.toBeNull();
    });

    it("преобразует ошибку репозитория в строку", async () => {
      repository.findOne.mockRejectedValue("ошибка БД");

      await expect(service.findRecord("4606008629937")).rejects.toBe(
        "Не удалось получить запись ошибка БД",
      );
    });

    it("включает текст Error в сообщение об ошибке", async () => {
      repository.findOne.mockRejectedValue(new Error("сбой БД"));

      await expect(service.findRecord("4606008629937")).rejects.toBe(
        "Не удалось получить запись Error: сбой БД",
      );
    });

    it("передаёт пустое value в репозиторий без дополнительной проверки", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findRecord("")).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({ where: { value: "" } });
    });
  });

  describe("saveGeneratedRecord", () => {
    it("создаёт новую запись, если её ещё нет", async () => {
      const payload = makePayload();
      const saved = makeRecord({ id: 11 });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(saved);

      const result = await service.saveGeneratedRecord(payload);

      expect(result).toEqual(saved);
      expect(repository.save).toHaveBeenCalledWith(payload);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("обновляет существующую запись и возвращает свежую версию", async () => {
      const payload = makePayload();
      const existing = makeRecord({ id: 7, name: "Старое название" });
      const updated = makeRecord({ name: "Новое название" });
      repository.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);

      const result = await service.saveGeneratedRecord(payload);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(existing.id, payload);
      expect(repository.findOne).toHaveBeenCalledTimes(2);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("преобразует ошибку save в строку", async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockRejectedValue("ошибка записи");

      await expect(service.saveGeneratedRecord(makePayload())).rejects.toBe(
        "Не удалось сохранить запись товара, ошибка записи",
      );
    });

    it("преобразует ошибку update в строку", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      repository.update.mockRejectedValue("ошибка обновления");

      await expect(service.saveGeneratedRecord(makePayload())).rejects.toBe(
        "Не удалось обновить запись о товаре, ошибка обновления",
      );
    });

    it("возвращает null, если запись исчезла после обновления", async () => {
      const payload = makePayload();
      repository.findOne.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null);

      await expect(service.saveGeneratedRecord(payload)).resolves.toBeNull();
      expect(repository.update).toHaveBeenCalledWith(7, payload);
    });

    it("передаёт ошибку повторного чтения после обновления", async () => {
      repository.findOne
        .mockResolvedValueOnce(makeRecord())
        .mockRejectedValueOnce("ошибка повторного чтения");

      await expect(service.saveGeneratedRecord(makePayload())).rejects.toBe(
        "Не удалось получить запись ошибка повторного чтения",
      );
    });

    it("возвращает результат save как есть, включая null", async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(null);

      await expect(service.saveGeneratedRecord(makePayload())).resolves.toBeNull();
    });
  });

  describe("checkImportItems", () => {
    it("возвращает completed, если есть и запись, и товар", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockResolvedValue({ id: 42 });

      const result = await service.checkImportItems([
        { id: 1, name: "Название", barcode: " 4606008629937 ", price: "100" },
      ]);

      expect(result).toEqual({ 1: { status: "completed", product_id: 42 } });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { value: "4606008629937" },
      });
      expect(productService.findByCode).toHaveBeenCalledWith(" 4606008629937 ");
    });

    it("возвращает record, если запись есть, а товара нет", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockResolvedValue(null);

      const result = await service.checkImportItems([
        { id: 2, name: "Название", barcode: "4606008629937" },
      ]);

      expect(result).toEqual({ 2: { status: "record", product_id: null } });
    });

    it("возвращает empty, если запись не найдена", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.checkImportItems([
        { id: 3, name: "Название", barcode: "4606008629937" },
      ]);

      expect(result).toEqual({ 3: { status: "empty", product_id: null } });
      expect(productService.findByCode).not.toHaveBeenCalled();
    });

    it("не добавляет в результат элементы без штрих-кода и имени", async () => {
      const result = await service.checkImportItems([{ id: 4, name: "   ", barcode: "  " }]);

      expect(result).toEqual({});
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it("использует имя, если штрихкод пустой", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ value: "Название товара" }));
      productService.findByCode.mockResolvedValue(null);

      const result = await service.checkImportItems([
        { id: 5, name: "Название товара", barcode: "" },
      ]);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { value: "Название товара" },
      });
      expect(result).toEqual({ 5: { status: "record", product_id: null } });
    });

    it("обрабатывает несколько элементов и группирует результат по id", async () => {
      repository.findOne.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null);
      productService.findByCode.mockResolvedValue({ id: 42 });

      const result = await service.checkImportItems([
        { id: 10, name: "Первый", barcode: "4606008629937" },
        { id: 20, name: "Второй", barcode: "0000000000000" },
      ]);

      expect(result).toEqual({
        10: { status: "completed", product_id: 42 },
        20: { status: "empty", product_id: null },
      });
    });

    it("пустой массив → пустой результат без обращений к зависимостям", async () => {
      await expect(service.checkImportItems([])).resolves.toEqual({});

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(productService.findByCode).not.toHaveBeenCalled();
    });

    it("повторяющийся id: результат последнего элемента перезаписывает первый", async () => {
      repository.findOne.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null);
      productService.findByCode.mockResolvedValue({ id: 42 });

      const result = await service.checkImportItems([
        { id: 1, name: "Первый", barcode: "4606008629937", price: "100" },
        { id: 1, name: "Второй", barcode: "0000000000000", price: "100" },
      ]);

      expect(repository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ 1: { status: "empty", product_id: null } });
    });

    it("пробельный barcode: поиск по имени с trim, в findByCode уходит сырой barcode", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ value: "Название товара" }));
      productService.findByCode.mockResolvedValue(null);

      const result = await service.checkImportItems([
        { id: 6, name: "  Название товара  ", barcode: "   ", price: "100" },
      ]);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { value: "Название товара" },
      });
      expect(productService.findByCode).toHaveBeenCalledWith("   ");
      expect(result).toEqual({ 6: { status: "record", product_id: null } });
    });

    it("элемент без barcode: findByCode получает undefined", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ value: "Название товара" }));
      productService.findByCode.mockResolvedValue(null);

      const result = await service.checkImportItems([
        { id: 7, name: "Название товара", price: "100" } as never,
      ]);

      expect(productService.findByCode).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ 7: { status: "record", product_id: null } });
    });

    it("ошибка findOne не перехватывается", async () => {
      repository.findOne.mockRejectedValue("сбой поиска");

      await expect(
        service.checkImportItems([
          { id: 8, name: "Название", barcode: "4606008629937", price: "100" },
        ]),
      ).rejects.toBe("сбой поиска");
    });

    it("ошибка findByCode не перехватывается", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockRejectedValue("сбой поиска товара");

      await expect(
        service.checkImportItems([
          { id: 9, name: "Название", barcode: "4606008629937", price: "100" },
        ]),
      ).rejects.toBe("сбой поиска товара");
    });
  });

  describe("resolveCategory", () => {
    it("возвращает null для не-объекта", async () => {
      await expect(service.resolveCategory("нет" as never)).resolves.toBeNull();
      expect(categoryService.validateCategoryChain).not.toHaveBeenCalled();
    });

    it("возвращает положительный category_id без создания категорий", async () => {
      await expect(
        service.resolveCategory({
          category_id: 9,
          create_categories: [{ name: "Новая", parent_id: 1 }],
        }),
      ).resolves.toBe(9);

      expect(categoryService.validateCategoryChain).not.toHaveBeenCalled();
      expect(categoryService.create).not.toHaveBeenCalled();
    });

    it("создаёт цепочку категорий и возвращает id последней", async () => {
      categoryService.validateCategoryChain.mockResolvedValue(true);
      categoryService.getChildren
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([]);
      categoryService.create.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce({ id: 12 });

      const result = await service.resolveCategory({
        category_id: null,
        create_categories: [
          { name: "  Первая  ", parent_id: 3 },
          { name: "Вторая", parent_id: 99 },
        ],
      });

      expect(result).toBe(12);
      expect(categoryService.validateCategoryChain).toHaveBeenCalledWith([
        { name: "  Первая  ", parent_id: 3 },
        { name: "Вторая", parent_id: 99 },
      ]);
      expect(categoryService.getChildren).toHaveBeenNthCalledWith(1, 3, "admin");
      expect(categoryService.getChildren).toHaveBeenNthCalledWith(2, 11, "admin");
      expect(categoryService.create).toHaveBeenNthCalledWith(1, {
        name: "Первая",
        parent_id: 3,
        position: 3,
      });
      expect(categoryService.create).toHaveBeenNthCalledWith(2, {
        name: "Вторая",
        parent_id: 11,
        position: 1,
      });
    });

    it("использует null как родителя первой категории, если parent_id невалиден", async () => {
      categoryService.validateCategoryChain.mockResolvedValue(true);
      categoryService.getChildren.mockResolvedValue([]);
      categoryService.create.mockResolvedValue({ id: 21 });

      await service.resolveCategory({
        category_id: 0,
        create_categories: [{ name: "Первая", parent_id: -1 }],
      });

      expect(categoryService.getChildren).toHaveBeenCalledWith(null, "admin");
      expect(categoryService.create).toHaveBeenCalledWith({
        name: "Первая",
        parent_id: null,
        position: 1,
      });
    });

    it("возвращает null при невалидной цепочке категорий", async () => {
      categoryService.validateCategoryChain.mockResolvedValue(false);

      await expect(
        service.resolveCategory({
          category_id: null,
          create_categories: [{ name: "Первая", parent_id: 3 }],
        }),
      ).resolves.toBeNull();

      expect(categoryService.create).not.toHaveBeenCalled();
    });

    it("возвращает null без create_categories", async () => {
      await expect(
        service.resolveCategory({ category_id: null, create_categories: [] }),
      ).resolves.toBeNull();

      expect(categoryService.validateCategoryChain).not.toHaveBeenCalled();
    });

    it("null бросает TypeError: typeof null === object", async () => {
      await expect(service.resolveCategory(null as never)).rejects.toThrow(TypeError);
    });

    it("undefined → null", async () => {
      await expect(service.resolveCategory(undefined as never)).resolves.toBeNull();
    });

    it("create_categories не массив → null", async () => {
      await expect(
        service.resolveCategory({
          category_id: null,
          create_categories: "нет" as never,
        }),
      ).resolves.toBeNull();

      expect(categoryService.validateCategoryChain).not.toHaveBeenCalled();
    });

    it.each([
      { case: "строка", category_id: "5" as never },
      { case: "отрицательный", category_id: -1 },
      { case: "NaN", category_id: NaN },
    ])("невалидный category_id ($case) → создаётся цепочка", async ({ category_id }) => {
      categoryService.validateCategoryChain.mockResolvedValue(true);
      categoryService.getChildren.mockResolvedValue([]);
      categoryService.create.mockResolvedValue({ id: 33 });

      await expect(
        service.resolveCategory({
          category_id,
          create_categories: [{ name: "Категория", parent_id: 3 }],
        }),
      ).resolves.toBe(33);

      expect(categoryService.create).toHaveBeenCalledWith({
        name: "Категория",
        parent_id: 3,
        position: 1,
      });
    });

    it("getChildren вернул null → position = 1", async () => {
      categoryService.validateCategoryChain.mockResolvedValue(true);
      categoryService.getChildren.mockResolvedValue(null);
      categoryService.create.mockResolvedValue({ id: 33 });

      await service.resolveCategory({
        category_id: null,
        create_categories: [{ name: " Категория ", parent_id: 3 }],
      });

      expect(categoryService.create).toHaveBeenCalledWith({
        name: "Категория",
        parent_id: 3,
        position: 1,
      });
    });

    it("create вернул null → TypeError при чтении id", async () => {
      categoryService.validateCategoryChain.mockResolvedValue(true);
      categoryService.getChildren.mockResolvedValue([]);
      categoryService.create.mockResolvedValue(null);

      await expect(
        service.resolveCategory({
          category_id: null,
          create_categories: [{ name: "Категория", parent_id: 3 }],
        }),
      ).rejects.toThrow(TypeError);
    });

    it("ошибка validateCategoryChain не перехватывается", async () => {
      categoryService.validateCategoryChain.mockRejectedValue("сбой проверки цепочки");

      await expect(
        service.resolveCategory({
          category_id: null,
          create_categories: [{ name: "Категория", parent_id: 3 }],
        }),
      ).rejects.toBe("сбой проверки цепочки");
    });
  });

  describe("createProductFromRecord", () => {
    const payload = { barcode: "4606008629937" };

    it("отбрасывает запрос, если запись не найдена", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.createProductFromRecord(payload)).rejects.toBe(
        "Не найдена запись для штрих-кода 4606008629937. Сначала сгенерируйте данные о товаре",
      );
      expect(productService.create).not.toHaveBeenCalled();
    });

    it("отбрасывает запрос, если товар с таким штрих-кодом уже есть", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockResolvedValue({ id: 42 });

      await expect(service.createProductFromRecord(payload)).rejects.toBe(
        "Товар с штрих-кодом 4606008629937 уже существует (ID: 42)",
      );
      expect(productService.create).not.toHaveBeenCalled();
    });

    it("отбрасывает запрос, если товар не удалось создать", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue(null);

      await expect(service.createProductFromRecord(payload)).rejects.toBe(
        "Не удалось добавить новый товар",
      );
    });

    it("переносит данные записи в CreateProductDto и возвращает товар", async () => {
      const record = makeRecord({
        specifications: [],
        categories: null,
        price: null,
      });
      const created = { id: 42 };
      repository.findOne.mockResolvedValue(record);
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue(created);

      const result = await service.createProductFromRecord(payload);

      expect(result).toEqual(created);
      expect(productService.create).toHaveBeenCalledWith({
        category_id: null,
        purchase_price: 0,
        name: record.name,
        code: "4606008629937",
        description: record.description,
        product_type: record.product_type,
        equipment: record.equipment,
        country: record.country,
        brand_name: record.brand_name,
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
      });
      expect(priceTypeService.getAll).not.toHaveBeenCalled();
      expect(specificationsService.findByName).not.toHaveBeenCalled();
    });

    it("подставляет пустые строки для отсутствующих текстовых полей записи", async () => {
      const record = makeRecord({
        name: null as never,
        description: null as never,
        brand_name: null as never,
        specifications: [],
        categories: null,
        price: null,
      });
      repository.findOne.mockResolvedValue(record);
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });

      await service.createProductFromRecord(payload);

      expect(productService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
          description: "",
          brand_name: "",
        }),
      );
    });

    it("привязывает созданную категорию к товару", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({
          categories: { category_id: 9, create_categories: [] },
          specifications: [],
          price: null,
        }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });

      await service.createProductFromRecord(payload);

      expect(productService.update).toHaveBeenCalledWith(42, {
        category_id: 9,
      });
    });

    it("создаёт цены для всех типов цен, если в записи указана цена", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ specifications: [], categories: null }));
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });
      priceTypeService.getAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.createProductFromRecord(payload);

      expect(productPriceService.create).toHaveBeenCalledTimes(2);
      expect(productPriceService.create).toHaveBeenNthCalledWith(1, {
        product_id: 42,
        price_type_id: 1,
        price: 1000,
      });
      expect(productPriceService.create).toHaveBeenNthCalledWith(2, {
        product_id: 42,
        price_type_id: 2,
        price: 1000,
      });
    });

    it("не создаёт цены, если priceTypes пуст", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ specifications: [], categories: null }));
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });
      priceTypeService.getAll.mockResolvedValue([]);

      await service.createProductFromRecord(payload);

      expect(productPriceService.create).not.toHaveBeenCalled();
    });

    it("создаёт недостающие характеристики и пропускает пустые", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({
          price: null,
          categories: null,
          specifications: [
            { name: "Материал", value: "Хлопок" },
            { name: "Цвет", value: "Белый" },
            { name: "", value: "Пустое имя" },
            { name: "Нет значения", value: "" },
            { value: "Нет имени" } as { name: string; value: string },
          ],
        }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });
      specificationsService.findByName.mockResolvedValueOnce({ id: 3 }).mockResolvedValueOnce(null);
      specificationsService.create.mockResolvedValue({ id: 4 });

      await service.createProductFromRecord(payload);

      expect(specificationsService.findByName).toHaveBeenCalledTimes(2);
      expect(specificationsService.findByName).toHaveBeenCalledWith("Материал");
      expect(specificationsService.findByName).toHaveBeenCalledWith("Цвет");
      expect(specificationsService.create).toHaveBeenCalledTimes(1);
      expect(specificationsService.create).toHaveBeenCalledWith({
        name: "Цвет",
        type: "text",
      });
      expect(productSpecificationService.create).toHaveBeenCalledTimes(2);
      expect(productSpecificationService.create).toHaveBeenNthCalledWith(1, {
        product_id: 42,
        specification_id: 3,
        value: "Хлопок",
      });
      expect(productSpecificationService.create).toHaveBeenNthCalledWith(2, {
        product_id: 42,
        specification_id: 4,
        value: "Белый",
      });
    });

    it("не обрабатывает характеристики, если specifications не массив", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({
          price: null,
          categories: null,
          specifications: "не массив" as never,
        }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });

      await service.createProductFromRecord(payload);

      expect(specificationsService.findByName).not.toHaveBeenCalled();
      expect(productSpecificationService.create).not.toHaveBeenCalled();
    });

    it("price = 0 не создаёт цены: проверка на falsy", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({ price: 0, specifications: [], categories: null }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });
      priceTypeService.getAll.mockResolvedValue([{ id: 1 }]);

      await service.createProductFromRecord(payload);

      expect(priceTypeService.getAll).not.toHaveBeenCalled();
      expect(productPriceService.create).not.toHaveBeenCalled();
    });

    it("product.id = 0 не создаёт цены даже при ненулевой price", async () => {
      repository.findOne.mockResolvedValue(makeRecord({ specifications: [], categories: null }));
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 0 });
      priceTypeService.getAll.mockResolvedValue([{ id: 1 }]);

      await service.createProductFromRecord(payload);

      expect(priceTypeService.getAll).not.toHaveBeenCalled();
      expect(productPriceService.create).not.toHaveBeenCalled();
    });

    it("categories без валидного id не приводит к update товара", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({
          price: null,
          specifications: [],
          categories: { category_id: null, create_categories: [] },
        }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });

      await service.createProductFromRecord(payload);

      expect(categoryService.validateCategoryChain).not.toHaveBeenCalled();
      expect(productService.update).not.toHaveBeenCalled();
    });

    it("specifications.create вернул null → характеристика не привязывается", async () => {
      repository.findOne.mockResolvedValue(
        makeRecord({
          price: null,
          categories: null,
          specifications: [{ name: "Новый", value: "Значение" }],
        }),
      );
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });
      specificationsService.findByName.mockResolvedValue(null);
      specificationsService.create.mockResolvedValue(null);

      await service.createProductFromRecord(payload);

      expect(specificationsService.create).toHaveBeenCalledWith({
        name: "Новый",
        type: "text",
      });
      expect(productSpecificationService.create).not.toHaveBeenCalled();
    });

    it("code берётся из payload, а числовые null_fields передаются как есть", async () => {
      const record = makeRecord({
        code: "другой код",
        weight: null as never,
        height: null as never,
        price: null,
        specifications: [],
        categories: null,
      });
      repository.findOne.mockResolvedValue(record);
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockResolvedValue({ id: 42 });

      await service.createProductFromRecord(payload);

      expect(productService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "4606008629937",
          weight: null,
          height: null,
        }),
      );
    });

    it("ошибка findByCode не перехватывается", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockRejectedValue("сбой поиска товара");

      await expect(service.createProductFromRecord(payload)).rejects.toBe("сбой поиска товара");
      expect(productService.create).not.toHaveBeenCalled();
    });

    it("ошибка productService.create не перехватывается", async () => {
      repository.findOne.mockResolvedValue(makeRecord());
      productService.findByCode.mockResolvedValue(null);
      productService.create.mockRejectedValue(new Error("сбой создания"));

      await expect(service.createProductFromRecord(payload)).rejects.toThrow("сбой создания");
    });
  });
});
