import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrdersService } from "../orders.service";
import { Order } from "../entities/order.entity";
import { AddressService } from "src/address/address.service";
import { OrderProductService } from "src/order-product/order-product.service";
import { ProductService } from "src/product/product.service";
import { CartDiscountsService } from "src/cart-discounts/cart-discounts.service";
import { PromotionsService } from "src/promotions/promotions.service";
import { ProductStockService } from "src/product-stock/product-stock.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { TransfersService } from "src/transfers/transfers.service";

describe("OrdersService — интеграционные тесты acceptShortage", () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<Order>>;

  let orderIdCounter = 0;
  let orderProductIdCounter = 0;

  const makeAddress = (type: "pickup" | "courier" = "pickup") => ({
    type,
    name: "Тестовый адрес",
    place: "Москва",
    lng: 37.6173,
    lat: 55.7558,
    entrance: "1",
    flat: "10",
    floor: "2",
    intercom: "1234",
  });

  const makeOrderProduct = (overrides: Record<string, any>) => ({
    id: overrides.id ?? ++orderProductIdCounter,
    order_id: overrides.order_id ?? orderIdCounter,
    product_id: overrides.product_id ?? 100,
    name: overrides.name ?? "Товар А",
    code: overrides.code ?? "A-001",
    brand_id: 1,
    category_id: 1,
    description: "Описание",
    country: "Россия",
    product_type: "Электроника",
    equipment: "Базовая",
    weight: 100,
    height: 10,
    length: 20,
    width: 15,
    quantity: overrides.quantity ?? 10,
    price: overrides.price ?? 500,
    reservations: overrides.reservations ?? [{ stock_id: 1, warehouse_id: 1, quantity: overrides.quantity ?? 10 }],
    transfers: [],
  });

  const mockOrdersRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrderProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  const mockProductStockService = {
    reservedProductsForOrder: jest.fn(),
    decrementReserved: jest.fn(),
  };

  const mockWarehouseService = {
    findBaseWarehouseForOrder: jest.fn(),
  };

  const mockTransfersService = {
    findByOrderId: jest.fn(),
    remove: jest.fn(),
  };

  // ─── setup helpers ────────────────────────────────────────

  /**
   * Mock findOne для acceptShortage: возвращает заказ с нужными shortage_stocks.
   * Это заменяет вызов setShortageStocks — мы сразу подставляем нужное состояние.
   */
  function mockOrderForAcceptance(overrides: {
    id: number;
    shortage_stocks: { id: number; quantity: number }[];
    status?: string;
    create_user_id?: number;
    subtotal?: number;
    discount_percent?: number;
    discount_total?: number;
    discount_name?: string;
    total?: number;
    method_receipt?: string;
  }) {
    mockOrdersRepository.findOne.mockImplementation(async (options: any) => {
      const findId = options?.where?.id;
      if (findId === overrides.id) {
        return {
          id: overrides.id,
          status: overrides.status ?? "new",
          shortage_stocks: overrides.shortage_stocks,
          create_user_id: overrides.create_user_id ?? 1,
          subtotal: overrides.subtotal ?? 5000,
          discount_percent: overrides.discount_percent ?? 0,
          discount_total: overrides.discount_total ?? 0,
          discount_name: overrides.discount_name ?? "",
          discount_quantity: 0,
          total: overrides.total ?? 5000,
          method_receipt: overrides.method_receipt ?? "pickup",
        };
      }
      return null;
    });

    mockOrderProductService.findAll.mockImplementation(async () => []);
  }

  /**
   * Мок для полного флоу: create → setShortageStocks → acceptShortage.
   * Возвращает всё что нужно для всех трёх вызовов.
   */
  function setupFullFlowMocks(options?: {
    quantity?: number;
    price?: number;
    discount_percent?: number;
    discount_name?: string;
    method_receipt?: string;
    product_id?: number;
    product_name?: string;
  }) {
    const quantity = options?.quantity ?? 10;
    const price = options?.price ?? 500;
    const discount_percent = options?.discount_percent ?? 0;
    const discount_name = options?.discount_name ?? "";
    const method_receipt = options?.method_receipt ?? "pickup";
    const subtotal = quantity * price;
    const discount_total = Math.round((subtotal * discount_percent) / 100);
    const deliveryPrice = method_receipt === "courier" ? 100 : 0;
    const total = Math.floor(subtotal - discount_total + deliveryPrice);

    const pid = options?.product_id ?? 100;
    const pname = options?.product_name ?? "Товар А";

    // create mocks
    mockProductService.calculatePricesForOrder.mockResolvedValue({
      total,
      subtotal,
      discount_quantity: 0,
      products: [{ id: pid, name: pname }],
      productOptionsMap: new Map([[pid, { quantity, price }]]),
    });

    mockCartDiscountsService.getCartDiscountForOrder.mockResolvedValue({
      discount_percent,
      discount_name,
    });

    mockPromotionsService.getPromotionForOrder.mockResolvedValue({
      discount_percent: 0,
      discount_name: "",
    });

    mockWarehouseService.findBaseWarehouseForOrder.mockResolvedValue({ id: 1 });

    mockOrdersRepository.save.mockImplementation(async (data: any) => ({
      ...data,
      id: orderIdCounter,
      order_number: "",
      subtotal: Math.floor(subtotal),
      total,
      discount_total: Math.round(discount_total),
      discount_percent: Math.floor(discount_percent),
      discount_name,
    }));

    mockOrdersRepository.update.mockResolvedValue({} as any);

    mockProductStockService.reservedProductsForOrder.mockResolvedValue([
      { stock_id: 1, warehouse_id: 1, quantity },
    ]);

    mockOrderProductService.create.mockImplementation(async (data: any) => ({
      ...data,
      id: data.product_id || orderIdCounter,
    }));

    mockOrderProductService.update.mockResolvedValue({} as any);
    mockOrderProductService.remove.mockResolvedValue({} as any);

    return { subtotal, discount_percent, discount_total, discount_name, total, method_receipt };
  }

  /**
   * Подготовка моков для acceptShortage (после setShortageStocks).
   * uniqId нужен чтобы id order_product были уникальными и не совпадали с orderIdCounter.
   */
  function setupAcceptMocks(overrides: {
    orderId: number;
    shortage_stocks: { id: number; quantity: number; warehouse_id?: number }[];
    orderProducts: any[];
    status?: string;
    subtotal?: number;
    discount_percent?: number;
    discount_total?: number;
    discount_name?: string;
    discount_quantity?: number;
    total?: number;
    method_receipt?: string;
  }) {
    mockOrdersRepository.findOne.mockImplementation(async (options: any) => {
      const findId = options?.where?.id;
      if (findId === overrides.orderId) {
        return {
          id: overrides.orderId,
          status: overrides.status ?? "new",
          shortage_stocks: overrides.shortage_stocks,
          create_user_id: 1,
          subtotal: overrides.subtotal ?? 5000,
          discount_percent: overrides.discount_percent ?? 0,
          discount_total: overrides.discount_total ?? 0,
          discount_name: overrides.discount_name ?? "",
          discount_quantity: overrides.discount_quantity ?? 0,
          total: overrides.total ?? 5000,
          method_receipt: overrides.method_receipt ?? "pickup",
        };
      }
      return null;
    });

    mockOrderProductService.findAll.mockImplementation(async () =>
      overrides.orderProducts.map((p) => ({
        ...p,
        reservations: (p.reservations || []).map((r: any) => ({ ...r })),
      })),
    );
  }

  beforeEach(async () => {
    orderIdCounter++;
    orderProductIdCounter = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: AddressService, useValue: {} },
        { provide: OrderProductService, useValue: mockOrderProductService },
        { provide: ProductService, useValue: mockProductService },
        { provide: CartDiscountsService, useValue: mockCartDiscountsService },
        { provide: PromotionsService, useValue: mockPromotionsService },
        { provide: ProductStockService, useValue: mockProductStockService },
        { provide: WarehouseService, useValue: mockWarehouseService },
        { provide: TransfersService, useValue: mockTransfersService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(getRepositoryToken(Order)) as jest.Mocked<Repository<Order>>;

    jest.clearAllMocks();

    mockTransfersService.findByOrderId.mockResolvedValue([] as any);
    mockTransfersService.remove.mockResolvedValue({} as any);
  });

  // ─── полный флоу ──────────────────────────────────────────

  describe("полный флоу: создание → дефицит → принятие", () => {
    it("создаёт заказ, устанавливает дефицит и принимает изменения", async () => {
      setupFullFlowMocks();

      const order = await service.create({
        comment: "Тест",
        phone: "+79001234567",
        phoneCode: "+7",
        recipient_name: "Иван Иванов",
        payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z",
        date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(),
        products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1,
        user_role: "user",
      });

      expect(order.id).toBe(orderIdCounter);
      expect(order.total).toBe(5000);

      // Мокаем findOne для setShortageStocks
      const opId = 100;
      mockOrdersRepository.findOne.mockImplementation(async (options: any) => {
        if (options?.where?.id === order.id) {
          return { id: order.id, status: "new", shortage_stocks: [] };
        }
        return null;
      });

      mockOrderProductService.findAll.mockResolvedValue([
        makeOrderProduct({ id: opId, order_id: order.id, quantity: 10 }),
      ]);

      await service.setShortageStocks(order.id, [{ id: opId, quantity: 5, warehouse_id: 1 }]);

      // Мокаем findOne для acceptShortage
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({
          subtotal: 2500,
          total: 2500,
          shortage_stocks: [],
        }),
      );
    });
  });

  // ─── один товар, 10 → 5 ──────────────────────────────────

  describe("один товар, уменьшаем количество (10 → 5)", () => {
    it("уменьшает количество товара", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        opId,
        expect.objectContaining({ quantity: 5 }),
      );
    });

    it("уменьшает reservations", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      const reservationsCall = mockOrderProductService.update.mock.calls.find(
        ([, data]: [any, any]) => data && "reservations" in data,
      );

      expect(reservationsCall).toBeDefined();
      expect(reservationsCall![1]).toEqual(
        expect.objectContaining({
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }),
      );
    });

    it("уменьшает reserved на складе", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
    });

    it("пересчитывает subtotal = 2500 и total = 2500", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, price: 500, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({ subtotal: 2500, total: 2500 }),
      );
    });

    it("очищает shortage_stocks", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({ shortage_stocks: [] }),
      );
    });
  });

  // ─── один товар, → 0 ─────────────────────────────────────

  describe("один товар, количество → 0", () => {
    it("удаляет строку, subtotal 0, total 0", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 0, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(mockOrderProductService.remove).toHaveBeenCalledWith(opId);
      expect(mockOrderProductService.update).not.toHaveBeenCalled();

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({ subtotal: 0, discount_total: 0, total: 0, shortage_stocks: [] }),
      );
    });

    it("освобождает все резервы", async () => {
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 0, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 10);
    });
  });

  // ─── доставка курьером ───────────────────────────────────

  describe("доставка курьером", () => {
    it("добавляет стоимость доставки (100) в total", async () => {
      setupFullFlowMocks({ method_receipt: "courier" });
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "courier",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress("courier"), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
        method_receipt: "courier",
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({ subtotal: 2500, total: 2600 }),
      );
    });
  });

  // ─── скидка на корзину ────────────────────────────────────

  describe("скидка на корзину (10%)", () => {
    it("пересчитывает discount_total при уменьшении", async () => {
      setupFullFlowMocks({ discount_percent: 10, discount_name: "Скидка за объём" });
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, price: 500, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
        subtotal: 5000,
        discount_percent: 10,
        discount_total: 500,
        discount_name: "Скидка за объём",
        total: 4500,
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({ subtotal: 2500, discount_total: 250, total: 2250 }),
      );
    });
  });

  // ─── скидка за количество (discount_quantity) ─────────────

  describe("скидка за количество (discount_quantity)", () => {
    it("пересчитывается пропорционально уменьшению", async () => {
      // Исходный заказ: subtotal=5000, discount_quantity=500, total=4500,
      // pickup (delivery=0) → oldOpticSum = 4500 + 0 - 0 = 4500.
      // shortage 10 → 5: newSubtotal = 2500.
      // newDiscountQuantity = round(500 × 2500/4500) = 278.
      setupFullFlowMocks();
      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(), products: [{ product_id: 100, quantity: 10 }],
        create_user_id: 1, user_role: "user",
      });

      const opId = 99;
      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [{ id: opId, quantity: 5, warehouse_id: 1 }],
        orderProducts: [
          makeOrderProduct({ id: opId, order_id: order.id, quantity: 10, price: 500, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
        ],
        subtotal: 5000,
        discount_quantity: 500,
        discount_total: 0,
        total: 4500,
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({
          subtotal: 2500,
          discount_quantity: 278,
        }),
      );
    });
  });

  // ─── несколько товаров ────────────────────────────────────

  describe("несколько товаров, разные дефициты", () => {
    it("обрабатывает все товары корректно", async () => {
      setupFullFlowMocks({
        products: [
          { id: 100, name: "Товар А" },
          { id: 200, name: "Товар Б" },
        ],
        productOptionsMap: new Map([
          [100, { quantity: 10, price: 500 }],
          [200, { quantity: 10, price: 300 }],
        ]),
      } as any);

      const order = await service.create({
        comment: "", phone: "+79001234567", phoneCode: "+7",
        recipient_name: "Иван Иванов", payment_method: "cash",
        method_receipt: "pickup",
        date_from: "2026-09-15T00:00:00.000Z", date_to: "2026-09-20T23:59:59.999Z",
        address: makeAddress(),
        products: [
          { product_id: 100, quantity: 10 },
          { product_id: 200, quantity: 10 },
        ],
        create_user_id: 1, user_role: "user",
      });

      const op1Id = 99;
      const op2Id = 100;

      setupAcceptMocks({
        orderId: order.id,
        shortage_stocks: [
          { id: op1Id, quantity: 5, warehouse_id: 1 },
          { id: op2Id, quantity: 0, warehouse_id: 1 },
        ],
        orderProducts: [
          makeOrderProduct({ id: op1Id, order_id: order.id, product_id: 100, name: "Товар А", quantity: 10, price: 500, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] }),
          makeOrderProduct({ id: op2Id, order_id: order.id, product_id: 200, name: "Товар Б", quantity: 10, price: 300, reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }] }),
        ],
        subtotal: 8000,
        total: 8000,
      });

      await service.acceptShortage(order.id, 1, "user");

      expect(mockOrderProductService.remove).toHaveBeenCalledWith(op2Id);
      expect(mockOrderProductService.remove).toHaveBeenCalledTimes(1);

      expect(ordersRepository.update).toHaveBeenCalledWith(
        order.id,
        expect.objectContaining({
          subtotal: 2500,
          total: 2500,
          shortage_stocks: [],
        }),
      );
    });
  });
});
