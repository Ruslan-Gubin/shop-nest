import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';

import { OrdersService } from '../orders.service';
import { Order } from '../entities/order.entity';
import { ShipOrderDto } from '../dto/ship-order.dto';
import { validationPipe } from 'src/lib/validationPipe';

import { Sector } from 'src/sector/entities/sector.entity';
import { ProductStock } from 'src/product-stock/entities/product-stock.entity';
import { SectorService } from 'src/sector/sector.service';
import { ProductStockService } from 'src/product-stock/product-stock.service';

import { AddressService } from 'src/address/address.service';
import { OrderProductService } from 'src/order-product/order-product.service';
import { ProductService } from 'src/product/product.service';
import { CartDiscountsService } from 'src/cart-discounts/cart-discounts.service';
import { PromotionsService } from 'src/promotions/promotions.service';
import { WarehouseService } from 'src/warehouse/warehouse.service';
import { TransfersService } from 'src/transfers/transfers.service';
import { PaymentsService } from 'src/payments/payments.service';

/**
 * Ответственный склад по сектору доставки.
 *
 * Стенд:
 *   склад №1 (BASE) — владелец сектора, товар есть
 *   склад №2 (FAR)  — публичный, тот же товар
 *   клиент внутри сектора склада №1
 *
 * Проверяем, что распределение остатков и свод перемещений
 * корректны, когда товар уже лежит на ответственном складе.
 */

// ─── константы стенда ─────────────────────────────────────────

const BASE_WAREHOUSE_ID = 1;
const FAR_WAREHOUSE_ID = 2;
const PRODUCT_ID = 100;
const ORDER_ID = 500;
const ORDER_PRODUCT_ID = 900;
const SECTOR_PRICE = 300;

const BASE_COORDS = { lng: 37.617635, lat: 55.755814 };
const FAR_COORDS = { lng: 37.9, lat: 55.9 };
const CLIENT_COORDS = { lng: 37.617, lat: 55.755 };

// Квадрат вокруг координат склада №1, пары [lng, lat]
const SECTOR_POLYGON = [
  [37.6, 55.74],
  [37.64, 55.74],
  [37.64, 55.78],
  [37.6, 55.78],
];

// ─── in-memory остатки ────────────────────────────────────────

type StockRow = {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved: number;
  in_stock: boolean;
  coords: { lng: number; lat: number };
};

function createStockRepository(rows: StockRow[]) {
  let lastId = rows.reduce((max, r) => Math.max(max, r.id), 0);

  const toEntity = (row: StockRow) => ({
    id: row.id,
    product_id: row.product_id,
    warehouse_id: row.warehouse_id,
    quantity: row.quantity,
    reserved: row.reserved,
    in_stock: row.in_stock,
    warehouse: {
      id: row.warehouse_id,
      address: { lng: row.coords.lng, lat: row.coords.lat },
    },
  });

  return {
    find: jest.fn(async (opts: any) => {
      const productId = opts?.where?.product?.id;
      return rows
        .filter((r) => productId === undefined || r.product_id === productId)
        .map(toEntity);
    }),

    findOne: jest.fn(async (opts: any) => {
      const where = opts?.where ?? {};
      let found: StockRow | undefined;

      if (where.id !== undefined) {
        found = rows.find((r) => r.id === where.id);
      } else {
        found = rows.find(
          (r) =>
            r.product_id === where.product?.id &&
            r.warehouse_id === where.warehouse?.id,
        );
      }

      return found ? toEntity(found) : null;
    }),

    update: jest.fn(async (id: number, partial: any) => {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, partial);
      return { affected: row ? 1 : 0 };
    }),

    save: jest.fn(async (data: any) => {
      const row: StockRow = {
        id: ++lastId,
        product_id: data.product_id ?? data.product?.id,
        warehouse_id: data.warehouse_id ?? data.warehouse?.id,
        quantity: data.quantity ?? 0,
        reserved: data.reserved ?? 0,
        in_stock: data.in_stock ?? false,
        coords: { lng: 0, lat: 0 },
      };
      rows.push(row);
      return toEntity(row);
    }),
  };
}

// ─── моки сервисов ────────────────────────────────────────────

const mockOrdersRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockOrderProductService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  hasShortage: jest.fn(),
};

const mockProductService = {
  calculatePricesForOrder: jest.fn(),
};

const mockCartDiscountsService = {
  getCartDiscountForOrder: jest.fn(),
};

const mockPromotionsService = {
  getPromotionForOrder: jest.fn(),
};

const mockWarehouseService = {
  findBaseWarehouseForOrder: jest.fn(),
};

const mockTransfersService = {
  create: jest.fn(),
  remove: jest.fn(),
  findByOrderId: jest.fn(),
  updateStatusByOrderAndType: jest.fn(),
};

const mockSectorRepository = {
  find: jest.fn(),
};

// ─── тесты ────────────────────────────────────────────────────

describe('Ответственный склад по сектору — распределение остатков и перемещений', () => {
  let service: OrdersService;
  let productStockService: ProductStockService;

  let stockRows: StockRow[];

  function makeAddress() {
    return {
      type: 'courier',
      name: 'Тестовый адрес',
      place: 'Москва',
      lng: CLIENT_COORDS.lng,
      lat: CLIENT_COORDS.lat,
      entrance: '1',
      flat: '10',
      floor: '2',
      intercom: '1234',
    };
  }

  function makeOrderPayload() {
    return {
      comment: '',
      create_user_id: 1,
      user_role: 'user' as const,
      phone: '+79001234567',
      phoneCode: '+7',
      recipient_name: 'Иван Иванов',
      payment_method: 'cash' as const,
      method_receipt: 'courier' as const,
      date_from: '2026-09-15T00:00:00.000Z',
      date_to: '2026-09-20T23:59:59.999Z',
      address: makeAddress(),
      products: [{ product_id: PRODUCT_ID, quantity: 5 }],
    };
  }

  const baseReservation = (quantity: number) => ({
    stock_id: 1,
    warehouse_id: BASE_WAREHOUSE_ID,
    quantity,
  });

  function stockOn(warehouseId: number) {
    return stockRows.find((r) => r.warehouse_id === warehouseId);
  }

  async function validateShipPayload(payload: unknown) {
    return validationPipe.transform(
      payload,
      { type: 'body', metatype: ShipOrderDto },
    ) as Promise<ShipOrderDto>;
  }

  /** Заказ в указанном статусе для findOne в changeStatus */
  function stubOrder(status: string) {
    mockOrdersRepository.findOne.mockImplementation(async (opts: any) => {
      if (opts?.where?.id !== ORDER_ID) return null;
      return {
        id: ORDER_ID,
        status,
        method_receipt: 'courier',
        payment_method: 'cash',
        create_user_id: 1,
        warehouse: { id: BASE_WAREHOUSE_ID },
        address: { id: 1 },
        total: 5300,
      };
    });
  }

  beforeEach(async () => {
    stockRows = [
      {
        id: 1,
        product_id: PRODUCT_ID,
        warehouse_id: BASE_WAREHOUSE_ID,
        quantity: 10,
        reserved: 0,
        in_stock: false,
        coords: BASE_COORDS,
      },
      {
        id: 2,
        product_id: PRODUCT_ID,
        warehouse_id: FAR_WAREHOUSE_ID,
        quantity: 10,
        reserved: 0,
        in_stock: false,
        coords: FAR_COORDS,
      },
    ];

    mockSectorRepository.find.mockResolvedValue([
      {
        id: 10,
        warehouse_id: BASE_WAREHOUSE_ID,
        price: SECTOR_PRICE,
        min_sum: 0,
        coordinates: SECTOR_POLYGON,
        warehouse: {
          id: BASE_WAREHOUSE_ID,
          address: { lng: BASE_COORDS.lng, lat: BASE_COORDS.lat },
        },
      },
    ]);

    mockProductService.calculatePricesForOrder.mockResolvedValue({
      total: 5000,
      subtotal: 5000,
      discount_quantity: 0,
      products: [{ id: PRODUCT_ID, name: 'Товар А' }],
      productOptionsMap: new Map([[PRODUCT_ID, { quantity: 5, price: 1000 }]]),
    });

    mockCartDiscountsService.getCartDiscountForOrder.mockResolvedValue({
      discount_percent: 0,
      discount_name: '',
    });

    mockPromotionsService.getPromotionForOrder.mockResolvedValue({
      discount_percent: 0,
      discount_name: '',
    });

    mockOrdersRepository.save.mockImplementation(async (data: any) => ({
      ...data,
      id: ORDER_ID,
      order_number: '',
      subtotal: 5000,
      total: 5300,
      discount_total: 0,
      discount_percent: 0,
      discount_name: '',
    }));

    mockOrdersRepository.update.mockResolvedValue({} as any);

    mockOrderProductService.create.mockImplementation(async (data: any) => ({
      ...data,
      id: ORDER_PRODUCT_ID,
    }));

    mockOrderProductService.findOne.mockResolvedValue({
      id: ORDER_PRODUCT_ID,
      order_id: ORDER_ID,
      reservations: [baseReservation(5)],
    });

    mockOrderProductService.findAll.mockResolvedValue([
      {
        id: ORDER_PRODUCT_ID,
        order_id: ORDER_ID,
        product_id: PRODUCT_ID,
        quantity: 5,
        reservations: [baseReservation(5)],
        transfers: [],
        shortage_stocks: [],
      },
    ]);

    mockOrderProductService.update.mockResolvedValue({} as any);
    mockOrderProductService.hasShortage.mockResolvedValue(false);

    mockTransfersService.create.mockImplementation(async (transfer: any) => ({
      id: 1,
      ...transfer,
    }));
    mockTransfersService.remove.mockResolvedValue({} as any);
    mockTransfersService.findByOrderId.mockResolvedValue([] as any);
    mockTransfersService.updateStatusByOrderAndType.mockResolvedValue({} as any);

    const stockRepository = createStockRepository(stockRows);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        SectorService,
        ProductStockService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: getRepositoryToken(Sector), useValue: mockSectorRepository },
        { provide: getRepositoryToken(ProductStock), useValue: stockRepository },
        { provide: AddressService, useValue: {} },
        { provide: OrderProductService, useValue: mockOrderProductService },
        { provide: ProductService, useValue: mockProductService },
        { provide: CartDiscountsService, useValue: mockCartDiscountsService },
        { provide: PromotionsService, useValue: mockPromotionsService },
        { provide: WarehouseService, useValue: mockWarehouseService },
        { provide: TransfersService, useValue: mockTransfersService },
        {
          provide: PaymentsService,
          useValue: { createPayment: jest.fn(), findByOrder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    productStockService = module.get<ProductStockService>(ProductStockService);

    jest.clearAllMocks();
  });

  // ── распределение остатков ──────────────────────────────────

  describe('выбор склада для резервирования', () => {
    it('берёт товар с ответственного склада, когда там хватает', async () => {
      const reservations = await productStockService.reservedProductsForOrder(
        PRODUCT_ID,
        5,
        BASE_COORDS.lng,
        BASE_COORDS.lat,
      );

      expect(reservations).toEqual([baseReservation(5)]);
    });

    it('не задействует дальний склад, пока товар есть на ответственном', async () => {
      await productStockService.reservedProductsForOrder(
        PRODUCT_ID,
        5,
        BASE_COORDS.lng,
        BASE_COORDS.lat,
      );

      expect(stockOn(FAR_WAREHOUSE_ID)?.reserved).toBe(0);
    });

    it('добирает с других складов, только если на ответственном не хватает', async () => {
      stockOn(BASE_WAREHOUSE_ID)!.quantity = 2;

      const reservations = await productStockService.reservedProductsForOrder(
        PRODUCT_ID,
        5,
        BASE_COORDS.lng,
        BASE_COORDS.lat,
      );

      expect(reservations).toEqual([
        { stock_id: 1, warehouse_id: BASE_WAREHOUSE_ID, quantity: 2 },
        { stock_id: 2, warehouse_id: FAR_WAREHOUSE_ID, quantity: 3 },
      ]);
    });

    it('отдаёт весь товар с ответственного склада при флаге in_stock', async () => {
      stockOn(BASE_WAREHOUSE_ID)!.in_stock = true;
      stockOn(BASE_WAREHOUSE_ID)!.quantity = 0;

      const reservations = await productStockService.reservedProductsForOrder(
        PRODUCT_ID,
        5,
        BASE_COORDS.lng,
        BASE_COORDS.lat,
      );

      expect(reservations).toEqual([baseReservation(5)]);
    });
  });

  // ── создание заказа ─────────────────────────────────────────

  describe('create с доставкой', () => {
    it('назначает склад сектора ответственным складом заказа', async () => {
      const order = await service.create(makeOrderPayload() as any);

      expect(order.warehouse.id).toBe(BASE_WAREHOUSE_ID);
    });

    it('не путает склад сектора с ближайшим по расстоянию', async () => {
      const order = await service.create(makeOrderPayload() as any);

      expect(order.warehouse.id).not.toBe(FAR_WAREHOUSE_ID);
    });

    it('берёт цену доставки из сектора', async () => {
      const order = await service.create(makeOrderPayload() as any);

      expect(order.delivery_price).toBe(SECTOR_PRICE);
    });

    it('резервирует товар на складе сектора', async () => {
      await service.create(makeOrderPayload() as any);

      expect(mockOrderProductService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservations: [baseReservation(5)],
        }),
      );
    });
  });

  // ── смена статуса без ship() ───────────────────────────────

  describe('перевод в работу без вызова ship()', () => {
    it('переводит заказ из new в processing, когда перемещать нечего', async () => {
      stubOrder('new');

      await service.changeStatus(ORDER_ID);

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'processing',
      });
    });

    it('не создаёт перемещений на этом шаге', async () => {
      stubOrder('new');

      await service.changeStatus(ORDER_ID);

      expect(mockTransfersService.create).not.toHaveBeenCalled();
    });
  });

  // ── handleReadyTransfers ────────────────────────────────────

  describe('свод остатков при переходе processing → ready', () => {
    it('не двигает остатки, когда весь товар уже на ответственном складе', async () => {
      stubOrder('processing');

      await service.changeStatus(ORDER_ID);

      expect(stockOn(BASE_WAREHOUSE_ID)?.quantity).toBe(10);
      expect(stockOn(FAR_WAREHOUSE_ID)?.quantity).toBe(10);
    });

    it('оставляет резерв на ответственном складе нетронутым', async () => {
      stubOrder('processing');

      await service.changeStatus(ORDER_ID);

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        ORDER_PRODUCT_ID,
        { reservations: [baseReservation(5)], transfers: [] },
      );
    });

    it('переносит товар с других складов на ответственный', async () => {
      stubOrder('processing');
      mockOrderProductService.findAll.mockResolvedValue([
        {
          id: ORDER_PRODUCT_ID,
          order_id: ORDER_ID,
          product_id: PRODUCT_ID,
          quantity: 5,
          reservations: [
            { stock_id: 1, warehouse_id: BASE_WAREHOUSE_ID, quantity: 2 },
            { stock_id: 2, warehouse_id: FAR_WAREHOUSE_ID, quantity: 3 },
          ],
          transfers: [],
          shortage_stocks: [],
        },
      ]);

      await service.changeStatus(ORDER_ID);

      // дальний склад отдал 3, ответственный принял
      expect(stockOn(FAR_WAREHOUSE_ID)?.quantity).toBe(7);
      expect(stockOn(BASE_WAREHOUSE_ID)?.quantity).toBe(13);
    });

    it('записывает источники в transfers товара заказа', async () => {
      stubOrder('processing');
      mockOrderProductService.findAll.mockResolvedValue([
        {
          id: ORDER_PRODUCT_ID,
          order_id: ORDER_ID,
          product_id: PRODUCT_ID,
          quantity: 5,
          reservations: [
            { stock_id: 1, warehouse_id: BASE_WAREHOUSE_ID, quantity: 2 },
            { stock_id: 2, warehouse_id: FAR_WAREHOUSE_ID, quantity: 3 },
          ],
          transfers: [],
          shortage_stocks: [],
        },
      ]);

      await service.changeStatus(ORDER_ID);

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        ORDER_PRODUCT_ID,
        {
          reservations: [
            {
              stock_id: 1,
              warehouse_id: BASE_WAREHOUSE_ID,
              quantity: 5,
            },
          ],
          transfers: [
            { stock_id: 2, warehouse_id: FAR_WAREHOUSE_ID, quantity: 3 },
          ],
        },
      );
    });

    it('создаёт остаток на ответственном складе, если товара там не было', async () => {
      stubOrder('processing');
      stockOn(BASE_WAREHOUSE_ID)!.quantity = 0;
      mockOrderProductService.findAll.mockResolvedValue([
        {
          id: ORDER_PRODUCT_ID,
          order_id: ORDER_ID,
          product_id: PRODUCT_ID,
          quantity: 5,
          reservations: [
            { stock_id: 2, warehouse_id: FAR_WAREHOUSE_ID, quantity: 5 },
          ],
          transfers: [],
          shortage_stocks: [],
        },
      ]);

      await service.changeStatus(ORDER_ID);

      expect(stockOn(BASE_WAREHOUSE_ID)?.quantity).toBe(5);
      expect(stockOn(FAR_WAREHOUSE_ID)?.quantity).toBe(5);
    });

    it('переводит заказ в ready после свода', async () => {
      stubOrder('processing');

      await service.changeStatus(ORDER_ID);

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'ready',
      });
    });
  });

  // ── доставка ────────────────────────────────────────────────

  describe('переход ready → in_delivery', () => {
    it('создаёт доставку с ответственного склада', async () => {
      stubOrder('ready');

      await service.changeStatus(ORDER_ID);

      expect(mockTransfersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delivery',
          order_id: ORDER_ID,
          from_warehouse_id: BASE_WAREHOUSE_ID,
        }),
      );
    });

    it('переводит заказ в in_delivery', async () => {
      stubOrder('ready');

      await service.changeStatus(ORDER_ID);

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'in_delivery',
      });
    });
  });

  // ── отмена ──────────────────────────────────────────────────

  describe('отмена заказа', () => {
    it('возвращает резерв на склад при отмене', async () => {
      stubOrder('new');
      stockOn(BASE_WAREHOUSE_ID)!.reserved = 5;

      await service.rejectOrder(ORDER_ID, 'Клиент передумал', 2, 'admin');

      expect(stockOn(BASE_WAREHOUSE_ID)?.reserved).toBe(0);
    });

    it('переводит заказ в cancelled_new', async () => {
      stubOrder('new');
      stockOn(BASE_WAREHOUSE_ID)!.reserved = 5;

      await service.rejectOrder(ORDER_ID, 'Клиент передумал', 2, 'admin');

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'cancelled_new',
        rejected_reason: 'Клиент передумал',
      });
    });

    it('не даёт списать резерв больше, чем есть', async () => {
      stubOrder('new');
      stockOn(BASE_WAREHOUSE_ID)!.reserved = 0;

      await expect(
        service.rejectOrder(ORDER_ID, 'Клиент передумал', 2, 'admin'),
      ).rejects.toBe(
        'Невозможно снять с резерва больше, чем зарезервировано для остатка 1',
      );
    });
  });

  // ── ship() — только когда перемещения реально есть ──────────

  describe('ship() при наличии перемещений', () => {
    const movePayload = {
      transfers: [
        {
          type: 'transfer' as const,
          order_id: ORDER_ID,
          from_warehouse_id: FAR_WAREHOUSE_ID,
          to_warehouse_id: BASE_WAREHOUSE_ID,
        },
      ],
      reservations: [
        {
          id: ORDER_PRODUCT_ID,
          reservations: [
            { stock_id: 1, warehouse_id: BASE_WAREHOUSE_ID, quantity: 5 },
          ],
        },
      ],
    };

    it('принимает перемещение между разными складами', async () => {
      const validated = await validateShipPayload(movePayload);

      await expect(service.ship(validated)).resolves.not.toThrow();
    });

    it('переводит заказ в processing', async () => {
      const validated = await validateShipPayload(movePayload);

      await service.ship(validated);

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'processing',
      });
    });

    it('создаёт запись перемещения с указанными складами', async () => {
      const validated = await validateShipPayload(movePayload);

      await service.ship(validated);

      expect(mockTransfersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          from_warehouse_id: FAR_WAREHOUSE_ID,
          to_warehouse_id: BASE_WAREHOUSE_ID,
        }),
      );
    });

    it('откатывает созданные перемещения, если резервы не сошлись', async () => {
      mockOrderProductService.findOne.mockResolvedValue(null);

      const validated = await validateShipPayload(movePayload);

      await expect(service.ship(validated)).rejects.toBe(
        `Товар заказа с ID ${ORDER_PRODUCT_ID} не найден`,
      );
      expect(mockTransfersService.remove).toHaveBeenCalledWith(1);
      expect(mockOrdersRepository.update).not.toHaveBeenCalled();
    });

    it('не навязывает требование хотя бы одного перемещения как блокер', async () => {
      const noMovePayload = {
        transfers: [],
        reservations: [
          {
            id: ORDER_PRODUCT_ID,
            reservations: [
              { stock_id: 1, warehouse_id: BASE_WAREHOUSE_ID, quantity: 5 },
            ],
          },
        ],
      };

      // DTO отклоняет пустой массив — это ожидаемое поведение
      await expect(validateShipPayload(noMovePayload)).rejects.toMatchObject({
        status: 400,
      });

      // но штатный путь без перемещений идёт через changeStatus
      stubOrder('new');
      await expect(service.changeStatus(ORDER_ID)).resolves.not.toThrow();
      expect(mockOrdersRepository.update).toHaveBeenCalledWith(ORDER_ID, {
        status: 'processing',
      });
    });
  });
});
