import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { Server } from 'http';
import request from 'supertest';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { validationPipe } from 'src/lib/validationPipe';
import {
  ProductSourceRecordResultDto,
  SeoDto,
  SpecificationDto,
} from '../dto/product-source-record-result.dto';
import {
  RecordCategories,
  SaveGeneratedRecordDto,
} from '../dto/save-record.dto';
import { ProductSourceRecordController } from '../product-source-record.controller';
import { ProductSourceRecordService } from '../product-source-record.service';

type ResponseBody = {
  status?: string;
  statusCode?: number;
  data?: unknown;
  errors?: { key: string; message: string }[];
  message?: string | string[];
  error?: string;
};

describe('product-source-record dto', () => {
  let app: INestApplication;

  const mockService = {
    checkImportItems: jest.fn(),
    createProductFromRecord: jest.fn(),
    saveGeneratedRecord: jest.fn<Promise<unknown>, [unknown]>(),
    findRecord: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductSourceRecordController],
      providers: [
        { provide: ProductSourceRecordService, useValue: mockService },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(validationPipe);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.checkImportItems.mockResolvedValue([]);
    mockService.createProductFromRecord.mockResolvedValue(null);
    mockService.saveGeneratedRecord.mockResolvedValue(null);
  });

  const httpServer = () => app.getHttpServer() as Server;

  // ParseArrayPipe отвечает стандартным BadRequestException:
  // { statusCode: 400, message: string[], error: 'Bad Request' }
  const expectMessages = (body: ResponseBody, messages: string[]) => {
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(expect.arrayContaining(messages));
  };

  // Остальные эндпоинты используют глобальный пайп с responseData.
  const expectErrors = (body: ResponseBody, key: string, message?: string) => {
    expect(body.status).toBe('error');
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          message === undefined ? { key } : { key, message },
        ),
      ]),
    );
  };

  const collectConstraints = (errors: ValidationError[]): string[] =>
    errors.flatMap((error) => [
      ...Object.keys(error.constraints ?? {}),
      ...collectConstraints(error.children ?? []),
    ]);

  const validateConstraints = async (
    cls: ClassConstructor<object>,
    plain: object,
  ) =>
    collectConstraints(
      await validate(plainToInstance(cls, plain), {
        forbidUnknownValues: false,
      }),
    );

  describe('CheckImportItemDto', () => {
    const validItem = {
      id: 1,
      name: 'name',
      barcode: '12345678912',
      price: '100',
    };

    const postCheck = (body: object | null) =>
      request(httpServer())
        .post('/product-source-record/check-import-items')
        .send(body as object);

    it('валидный массив → 201, сервис получает элементы, ошибок нет', async () => {
      const items = [validItem];
      const response = await postCheck(items);

      expect(response.status).toBe(201);
      expect((response.body as ResponseBody).errors).toEqual([]);
      expect(mockService.checkImportItems).toHaveBeenCalledWith(items);
    });

    it('пустой массив → 201', async () => {
      const response = await postCheck([]);

      expect(response.status).toBe(201);
    });

    it.each([
      { case: 'объект', body: { id: 1 } },
      { case: 'null', body: null },
    ])('тело — $case → 400 с parsable array', async ({ body }) => {
      const response = await postCheck(body);

      expect(response.status).toBe(400);
      expect((response.body as ResponseBody).message).toBe(
        'Validation failed (parsable array expected)',
      );
    });

    it.each([null, 1])(
      'элемент массива %p не объект → 400 с ошибками полей',
      async (item) => {
        const response = await postCheck([item]);

        expect(response.status).toBe(400);
        expectMessages(response.body as ResponseBody, [
          'id must be an integer number',
          'name must be a string',
          'barcode must be a string',
          'Некорректный штрих-код',
          'Укажите штрих-код',
        ]);
      },
    );

    it.each(['12345678', '12345678901234'])(
      'barcode на границе длины (%s) → 201',
      async (barcode) => {
        const response = await postCheck([{ ...validItem, barcode }]);

        expect(response.status).toBe(201);
      },
    );

    it.each([0, -1])(
      'id = %s валиден: IsInt не требует положительности',
      async (id) => {
        const response = await postCheck([{ ...validItem, id }]);

        expect(response.status).toBe(201);
      },
    );

    it.each(['', null])(
      'price = %p валиден: IsOptional пропускает пустые значения',
      async (price) => {
        const response = await postCheck([{ ...validItem, price }]);

        expect(response.status).toBe(201);
      },
    );

    it('ошибка сервиса строкой → status error с этим сообщением', async () => {
      mockService.checkImportItems.mockRejectedValueOnce('сбой проверки');

      const response = await postCheck([validItem]);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: null,
        status: 'error',
        errors: [],
        message: 'сбой проверки',
      });
    });

    it.each([
      {
        case: 'id отсутствует',
        item: { ...validItem, id: undefined },
        messages: ['id must be an integer number'],
      },
      {
        case: 'id строкой',
        item: { ...validItem, id: '1' },
        messages: ['id must be an integer number'],
      },
      {
        case: 'id дробное',
        item: { ...validItem, id: 1.5 },
        messages: ['id must be an integer number'],
      },
      {
        case: 'name отсутствует',
        item: { ...validItem, name: undefined },
        messages: ['name must be a string'],
      },
      {
        case: 'name числом',
        item: { ...validItem, name: 1 },
        messages: ['name must be a string'],
      },
      {
        case: 'barcode отсутствует',
        item: { ...validItem, barcode: undefined },
        messages: ['Укажите штрих-код', 'Некорректный штрих-код'],
      },
      {
        case: 'barcode пустой',
        item: { ...validItem, barcode: '' },
        messages: ['Укажите штрих-код', 'Некорректный штрих-код'],
      },
      {
        case: 'barcode короче 8 цифр',
        item: { ...validItem, barcode: '12345' },
        messages: ['Некорректный штрих-код'],
      },
      {
        case: 'barcode длиннее 14 цифр',
        item: { ...validItem, barcode: '123456789012345' },
        messages: ['Некорректный штрих-код'],
      },
      {
        case: 'barcode с буквами',
        item: { ...validItem, barcode: 'abcdefgh' },
        messages: ['Некорректный штрих-код'],
      },
      {
        case: 'barcode числом',
        item: { ...validItem, barcode: 12345678 },
        messages: ['Некорректный штрих-код', 'barcode must be a string'],
      },
      {
        case: 'price числом',
        item: { ...validItem, price: 100 },
        messages: ['price must be a string'],
      },
    ])('$case → 400 с сообщениями валидации', async ({ item, messages }) => {
      const response = await postCheck([item]);

      expect(response.status).toBe(400);
      expectMessages(response.body as ResponseBody, messages);
    });

    it('невалидный второй элемент массива → 400', async () => {
      const response = await postCheck([validItem, { ...validItem, id: '2' }]);

      expect(response.status).toBe(400);
      expectMessages(response.body as ResponseBody, [
        'id must be an integer number',
      ]);
    });

    it('price опционален → 201', async () => {
      const response = await postCheck([
        { id: validItem.id, name: validItem.name, barcode: validItem.barcode },
      ]);

      expect(response.status).toBe(201);
    });

    it('пустое name валидно: у поля только IsString', async () => {
      const response = await postCheck([{ ...validItem, name: '' }]);

      expect(response.status).toBe(201);
    });
  });

  describe('CreateProductFromRecordDto', () => {
    const postCreate = (body: object) =>
      request(httpServer())
        .post('/product-source-record/create-product')
        .send(body);

    it.each(['12345678', '12345678912', '12345678901234'])(
      'barcode из %s → 201',
      async (barcode) => {
        const response = await postCreate({ barcode });

        expect(response.status).toBe(201);
        expect(mockService.createProductFromRecord).toHaveBeenCalledWith({
          barcode,
        });
      },
    );

    it.each([
      {
        case: 'barcode отсутствует',
        body: {},
        message: 'Некорректный штрих-код',
      },
      {
        case: 'barcode пустой',
        body: { barcode: '' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'barcode из 7 цифр',
        body: { barcode: '1234567' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'barcode из 15 цифр',
        body: { barcode: '123456789012345' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'barcode с буквами',
        body: { barcode: 'abcdefgh' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'barcode числом',
        body: { barcode: 12345678 },
        message: undefined,
      },
    ])('$case → 400 с ошибкой barcode', async ({ body, message }) => {
      const response = await postCreate(body);

      expect(response.status).toBe(400);
      expectErrors(response.body as ResponseBody, 'barcode', message);
    });

    it('barcode с пробелами по краям → 400: паттерн без trim', async () => {
      const response = await postCreate({ barcode: ' 12345678 ' });

      expect(response.status).toBe(400);
      expectErrors(
        response.body as ResponseBody,
        'barcode',
        'Некорректный штрих-код',
      );
    });

    it('ошибка сервиса Error → status error с текстом ошибки', async () => {
      mockService.createProductFromRecord.mockRejectedValueOnce(
        new Error('товар не создан'),
      );

      const response = await postCreate({ barcode: '12345678' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: null,
        status: 'error',
        errors: [],
        message: 'товар не создан',
      });
    });
  });

  describe('SaveGeneratedRecordDto', () => {
    const validRecord = {
      value: 'key-1',
      name: 'name',
      description: 'description',
      code: '12345678912',
      product_type: 'type',
      brand_name: 'brand',
      country: 'country',
      equipment: 'equipment',
      price: 100,
      weight: 1,
      height: 2,
      length: 3,
      width: 4,
      seo_title: 'seo_title',
      seo_description: 'seo_description',
      slug: 'slug',
      og_title: 'og_title',
      og_description: 'og_description',
      og_type: 'product',
      keywords: 'keywords',
      specifications: [{ name: 'spec name', value: 'spec value' }],
      categories: {
        category_id: 1,
        create_categories: [{ name: 'category name', parent_id: 2 }],
      },
    };

    const postSave = (body: object) =>
      request(httpServer())
        .post('/product-source-record/save-record')
        .send(body);

    it('полностью валидный payload → 201 и вызов сервиса', async () => {
      const response = await postSave(validRecord);

      expect(response.status).toBe(201);
      expect((response.body as ResponseBody).errors).toEqual([]);
      expect(mockService.saveGeneratedRecord).toHaveBeenCalled();
    });

    it('все поля валидны и при прямой валидации DTO', async () => {
      expect(
        await validateConstraints(SaveGeneratedRecordDto, validRecord),
      ).toEqual([]);
    });

    it('пустой объект → 400 с ошибками всех обязательных полей', async () => {
      const response = await postSave({});

      expect(response.status).toBe(400);
      const errors = (response.body as ResponseBody).errors ?? [];
      expect(errors.map((error) => error.key)).toEqual(
        expect.arrayContaining([
          'value',
          'name',
          'code',
          'specifications',
          'categories',
        ]),
      );
    });

    it('categories: null → 400', async () => {
      const response = await postSave({ ...validRecord, categories: null });

      expect(response.status).toBe(400);
      expectErrors(
        response.body as ResponseBody,
        'categories',
        'categories must be an object',
      );
    });

    it('specifications: границы 3 и 255 символов валидны', async () => {
      for (const length of [3, 255]) {
        const text = 'x'.repeat(length);
        expect(
          await validateConstraints(SaveGeneratedRecordDto, {
            ...validRecord,
            specifications: [{ name: text, value: text }],
          }),
        ).toEqual([]);
      }
    });

    it('глобальный пайп превращает categories в экземпляр RecordCategories', async () => {
      await postSave(validRecord);

      const payload = mockService.saveGeneratedRecord.mock.calls[0][0] as {
        categories: unknown;
      };
      expect(payload.categories).toBeInstanceOf(RecordCategories);
    });

    it('ошибка сервиса строкой → status error с этим сообщением', async () => {
      mockService.saveGeneratedRecord.mockRejectedValueOnce(
        'запись не сохранена',
      );

      const response = await postSave(validRecord);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        data: null,
        status: 'error',
        errors: [],
        message: 'запись не сохранена',
      });
    });

    const stringFields = [
      'value',
      'name',
      'description',
      'code',
      'product_type',
      'brand_name',
      'country',
      'equipment',
      'seo_title',
      'seo_description',
      'slug',
      'og_title',
      'og_description',
      'og_type',
      'keywords',
    ] as const;

    it.each(stringFields.map((field) => ({ field })))(
      '$field не строка → 400 с ошибкой $field',
      async ({ field }) => {
        const response = await postSave({ ...validRecord, [field]: 123 });

        expect(response.status).toBe(400);
        expectErrors(response.body as ResponseBody, field);
      },
    );

    it.each([
      {
        case: 'value пустой',
        key: 'value',
        body: { ...validRecord, value: '' },
        message: 'Укажите ключ по которому сохранится запись',
      },
      {
        case: 'code пустой',
        key: 'code',
        body: { ...validRecord, code: '' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'code короче 8 цифр',
        key: 'code',
        body: { ...validRecord, code: '12345' },
        message: 'Некорректный штрих-код',
      },
      {
        case: 'code длиннее 14 цифр',
        key: 'code',
        body: { ...validRecord, code: '123456789012345' },
        message: 'Некорректный штрих-код',
      },
    ])('$case → 400 с ошибкой $key', async ({ key, body, message }) => {
      const response = await postSave(body);

      expect(response.status).toBe(400);
      expectErrors(response.body as ResponseBody, key, message);
    });

    // ValidateIf получает первым аргументом весь объект, а не значение поля,
    // поэтому проверки числовых nullable-полей сейчас пропускаются.
    it.each(['price', 'weight', 'height', 'length', 'width'] as const)(
      '%s принимает нечисловое значение (текущее поведение)',
      async (field) => {
        const response = await postSave({
          ...validRecord,
          [field]: 'не число',
        });

        expect(response.status).toBe(201);
      },
    );

    it.each([
      {
        case: 'specifications не массив',
        body: { ...validRecord, specifications: 'нет' },
      },
      {
        case: 'specifications с коротким именем',
        body: {
          ...validRecord,
          specifications: [{ name: 'ab', value: 'норма' }],
        },
      },
      {
        case: 'specifications со значением-числом',
        body: { ...validRecord, specifications: [{ name: 'норма', value: 1 }] },
      },
    ])('$case → 400 с ошибкой specifications', async ({ body }) => {
      const response = await postSave(body);

      expect(response.status).toBe(400);
      expectErrors(response.body as ResponseBody, 'specifications');
    });

    it('categories не объект → 400 с ошибкой categories', async () => {
      const response = await postSave({ ...validRecord, categories: 'нет' });

      expect(response.status).toBe(400);
      expectErrors(
        response.body as ResponseBody,
        'categories',
        'categories must be an object',
      );
    });

    // У categories нет @ValidateNested(), поэтому содержимое объекта не проверяется
    // на уровне HTTP; правила RecordCategories разобраны отдельно ниже.
    it.each([
      {
        case: 'categories без create_categories',
        body: { ...validRecord, categories: {} },
      },
      {
        case: 'categories с не массивом create_categories',
        body: { ...validRecord, categories: { create_categories: 'нет' } },
      },
    ])('$case → 201 (текущее поведение)', async ({ body }) => {
      const response = await postSave(body);

      expect(response.status).toBe(201);
    });

    it('specifications: name и value должны быть строками от 3 до 255 символов', async () => {
      const short = await validateConstraints(SaveGeneratedRecordDto, {
        ...validRecord,
        specifications: [{ name: 'ab', value: 'нормальное значение' }],
      });
      expect(short).toContain('minLength');

      const long = await validateConstraints(SaveGeneratedRecordDto, {
        ...validRecord,
        specifications: [
          { name: 'x'.repeat(256), value: 'нормальное значение' },
        ],
      });
      expect(long).toContain('maxLength');

      const nonString = await validateConstraints(SaveGeneratedRecordDto, {
        ...validRecord,
        specifications: [{ name: 'нормальное имя', value: 1 }],
      });
      expect(nonString).toContain('isString');
    });

    it('RecordCategories: create_categories обязателен и должен быть массивом', async () => {
      const missing = await validateConstraints(RecordCategories, {
        category_id: 1,
      });
      expect(missing).toEqual(
        expect.arrayContaining(['isArray', 'isNotEmpty']),
      );

      const wrongType = await validateConstraints(RecordCategories, {
        create_categories: 'нет',
      });
      expect(wrongType).toContain('isArray');

      const empty = await validateConstraints(RecordCategories, {
        create_categories: [],
      });
      expect(empty).toEqual([]);
    });

    it('CreateCategoriesItem: имя от 3 до 255 символов, parent_id не проверяется', async () => {
      const shortName = await validateConstraints(RecordCategories, {
        create_categories: [{ name: 'ab', parent_id: 1 }],
      });
      expect(shortName).toContain('minLength');

      const longName = await validateConstraints(RecordCategories, {
        create_categories: [{ name: 'x'.repeat(256), parent_id: 1 }],
      });
      expect(longName).toContain('maxLength');

      const nonNumberParent = await validateConstraints(RecordCategories, {
        create_categories: [{ name: 'нормальное имя', parent_id: 'не число' }],
      });
      expect(nonNumberParent).toEqual([]);
    });

    it('RecordCategories: category_id строкой проходит из-за ValidateIf', async () => {
      const errors = await validateConstraints(RecordCategories, {
        category_id: 'не число',
        create_categories: [],
      });

      expect(errors).toEqual([]);
    });
  });

  describe('ProductSourceRecordResultDto', () => {
    it('не имеет декораторов валидации: любые данные проходят проверку', async () => {
      const payload = {
        names: null,
        clearName: 123,
        seo: 'не объект',
        specifications: 42,
        photos: {},
      };

      const classes: ClassConstructor<object>[] = [
        ProductSourceRecordResultDto,
        SeoDto,
        SpecificationDto,
      ];

      for (const cls of classes) {
        expect(
          await validate(plainToInstance(cls, payload), {
            forbidUnknownValues: false,
          }),
        ).toHaveLength(0);
      }
    });

    it('GET /:value → 200 и данные от сервиса', async () => {
      const data = {
        names: ['name'],
        clearName: 'name',
        seo: null,
        specifications: [],
        photos: [],
      };
      mockService.findRecord.mockResolvedValueOnce(data);

      const response = await request(httpServer()).get(
        '/product-source-record/key-1',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data,
        status: 'success',
        errors: [],
        message: 'Запись получена',
      });
      expect(mockService.findRecord).toHaveBeenCalledWith('key-1');
    });

    it.each([
      {
        case: 'строка',
        error: 'запись не получена',
        message: 'запись не получена',
      },
      {
        case: 'Error',
        error: new Error('сбой репозитория'),
        message: 'сбой репозитория',
      },
      { case: ' falsy', error: null, message: 'Ошибка на стороне сервера' },
    ])(
      'GET /:value, ошибка сервиса ($case) → status error',
      async ({ error, message }) => {
        mockService.findRecord.mockRejectedValueOnce(error);

        const response = await request(httpServer()).get(
          '/product-source-record/key-1',
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          data: null,
          status: 'error',
          errors: [],
          message,
        });
      },
    );
  });
});
