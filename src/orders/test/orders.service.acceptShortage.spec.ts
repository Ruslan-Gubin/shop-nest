import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
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

// ─── Базовые фабрики данных ────────────────────────────────
//
// Важно: shortage_stocks хранится на каждом товаре заказа
// (order_product.shortage_stocks), а НЕ на самом заказе —
// сервис читает его из findAll(id) (orders.service.ts:159).

describe("OrdersService — acceptShortage", () => {
  const baseOrder = (overrides?: Record<string, any>) => ({
    id: 1,
    status: "new",
    create_user_id: 1,
    subtotal: 5000,
    discount_percent: 0,
    discount_total: 0,
    discount_name: "",
    discount_quantity: 0,
    total: 5000,
    method_receipt: "pickup",
    delivery_price: 0,
    ...overrides,
  });

  const baseOrderProduct = (overrides?: Record<string, any>) => ({
    id: 10,
    order_id: 1,
    product_id: 100,
    name: "Товар А",
    quantity: 10,
    price: 500,
    reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
    shortage_stocks: [],
    transfers: [],
    ...overrides,
  });

  let service: OrdersService;

  const mockOrdersRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderProductService = {
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductStockService = {
    decrementReserved: jest.fn(),
  };

  const mockTransfersService = {
    findByOrderId: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: AddressService, useValue: {} },
        { provide: OrderProductService, useValue: mockOrderProductService },
        { provide: ProductService, useValue: {} },
        { provide: CartDiscountsService, useValue: {} },
        { provide: PromotionsService, useValue: {} },
        { provide: ProductStockService, useValue: mockProductStockService },
        { provide: WarehouseService, useValue: {} },
        { provide: TransfersService, useValue: mockTransfersService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();

    // Базовый флоу: заказ new, 1 товар (id:10, qty:10, price:500),
    // дефицит активен на товаре заказа: 10 → 5
    mockOrdersRepository.findOne.mockResolvedValue(baseOrder() as any);
    mockOrdersRepository.update.mockResolvedValue({} as any);
    mockOrderProductService.findAll.mockResolvedValue([
      baseOrderProduct({
        shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
      }) as any,
    ]);
    mockOrderProductService.update.mockResolvedValue({} as any);
    mockOrderProductService.remove.mockResolvedValue({} as any);
    mockProductStockService.decrementReserved.mockResolvedValue({} as any);
    mockTransfersService.findByOrderId.mockResolvedValue([] as any);
    mockTransfersService.remove.mockResolvedValue({} as any);
  });

  // ─── A. Валидация ──────────────────────────────────────

  describe("A. Валидация", () => {
    it("заказ не найден → ошибка", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(null);

      await expect(service.acceptShortage(999, 1, "user")).rejects.toBe("Заказ 999 не найден");
    });

    it("shortage_stocks пустой на всех товарах → ошибка", async () => {
      mockOrderProductService.findAll.mockResolvedValue([baseOrderProduct()] as any);

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        "Нет изменений по остаткам для принятия",
      );
    });

    it("orderProducts пустой → ошибка", async () => {
      mockOrderProductService.findAll.mockResolvedValue([]);

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        "Не удалось найти список товаров для этого заказа",
      );
    });
  });

  // ─── B. Авторизация ────────────────────────────────────

  describe("B. Авторизация", () => {
    it("владелец заказа → ок", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalled();
    });

    it("admin → ок", async () => {
      await service.acceptShortage(1, 99, "admin");

      expect(mockOrdersRepository.update).toHaveBeenCalled();
    });

    it("moderator → ок", async () => {
      await service.acceptShortage(1, 99, "moderator");

      expect(mockOrdersRepository.update).toHaveBeenCalled();
    });

    it("не владелец и не admin/moderator → ошибка", async () => {
      await expect(service.acceptShortage(1, 99, "user")).rejects.toBe(
        "Недостаточно прав для принятия изменений в заказе 1",
      );
    });

    it("wholesaler → ошибка", async () => {
      await expect(service.acceptShortage(1, 99, "wholesaler")).rejects.toBe(
        "Недостаточно прав для принятия изменений в заказе 1",
      );
    });
  });

  // ─── C. Статусы ────────────────────────────────────────

  describe("C. Статусы", () => {
    const allowedStatuses = ["new", "processing"];
    const rejectedStatuses = ["ready", "in_delivery", "completed", "cancelled_new"];

    it.each(allowedStatuses)("статус «%s» → ок", async (status) => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status }) as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalled();
    });

    it.each(rejectedStatuses)("статус «%s» → ошибка", async (status) => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status }) as any);

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        `Невозможно принять изменения для заказа в статусе ${status}`,
      );
    });
  });

  // ─── D. Один товар, уменьшение (10 → 5) ────────────────

  describe("D. Один товар, уменьшение (10 → 5)", () => {
    // Предусловие: заказ с 1 товаром (id:10, qty:10, price:500),
    // на товаре дефицит: shortage_stocks = [{ stock_id:1, warehouse_id:1, quantity:5 }]

    it("обновляет quantity товара заказа до 5", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ quantity: 5 }),
      );
    });

    it("уменьшает reservations с 10 до 5", async () => {
      await service.acceptShortage(1, 1, "user");

      const call = mockOrderProductService.update.mock.calls.find(
        ([, data]: [any, any]) => data && "reservations" in data,
      );

      expect(call).toBeDefined();
      expect(call![1]).toEqual(
        expect.objectContaining({
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }),
      );
    });

    it("декрементирует reserved на складе на 5", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
    });

    it("subtotal = 2500 (5 × 500)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 2500 }),
      );
    });

    it("discount_total = 0 (percent = 0)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ discount_total: 0 }),
      );
    });

    it("total = 2500", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ total: 2500 }),
      );
    });

    it("shortage_stocks очищается на товаре заказа, а не на заказе", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ shortage_stocks: [] }),
      );

      const orderUpdate = mockOrdersRepository.update.mock.calls[0];
      expect(orderUpdate[1]).not.toHaveProperty("shortage_stocks");
    });

    it("discount_percent и discount_name не меняются", async () => {
      await service.acceptShortage(1, 1, "user");

      const updateCall = mockOrdersRepository.update.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty("discount_percent");
      expect(updateCall[1]).not.toHaveProperty("discount_name");
    });
  });

  // ─── E. Один товар, удаление (→ 0) ────────────────────

  describe("E. Один товар, удаление (→ 0)", () => {
    // Предусловие: на товаре дефицит: quantity = 0
    // Ожидание: строка удаляется, subtotal=0, total=0, все резервы освобождены

    beforeEach(() => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 0 }],
        }) as any,
      ]);
    });

    it("subtotal = 0, discount_total = 0, total = 0", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 0, discount_total: 0, total: 0 }),
      );
    });

    it("все резервы освобождаются (10 единиц)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 10);
    });

    it("строка order_product удаляется, update НЕ вызывается", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.remove).toHaveBeenCalledWith(10);
      expect(mockOrderProductService.remove).toHaveBeenCalledTimes(1);
      expect(mockOrderProductService.update).not.toHaveBeenCalled();
    });
  });

  // ─── F. Ключевой баг: несколько товаров, часть БЕЗ дефицита ──

  describe("F. Несколько товаров — только часть в shortage_stocks", () => {
    // Предусловие:
    //   Товар А (id:10): qty=10, price=500, дефицит 10 → 5
    //   Товар Б (id:20): qty=10, price=300, БЕЗ дефицита
    //
    // Ожидание:
    //   Товар А: обновлён до qty=5
    //   Товар Б: НЕ обновлён, остался qty=10
    //   subtotal = 5×500 + 10×300 = 5500

    beforeEach(() => {
      const orderProductA = baseOrderProduct({
        id: 10,
        product_id: 100,
        quantity: 10,
        price: 500,
        reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
        shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
      });
      const orderProductB = baseOrderProduct({
        id: 20,
        product_id: 200,
        name: "Товар Б",
        quantity: 10,
        price: 300,
        reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }],
      });

      mockOrderProductService.findAll.mockResolvedValue([orderProductA, orderProductB] as any);
    });

    it("subtotal = 5500 (5×500 + 10×300)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 5500 }),
      );
    });

    it("только товар А обновляется", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledTimes(1);
      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ quantity: 5 }),
      );
    });

    it("товар Б НЕ обновляется", async () => {
      await service.acceptShortage(1, 1, "user");

      const allIds = mockOrderProductService.update.mock.calls.map(([id]) => id);
      expect(allIds).not.toContain(20);
    });

    it("reserved декрементируется только для товара А (на 5)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledTimes(1);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
    });
  });

  // ─── G. Несколько товаров, все с дефицитом ─────────────

  describe("G. Несколько товаров — все в shortage_stocks", () => {
    // Предусловие:
    //   Товар А (id:10): qty=10, price=500, дефицит 10 → 5
    //   Товар Б (id:20): qty=10, price=300, дефицит 10 → 0
    //
    // Ожидание:
    //   subtotal = 5×500 + 0×300 = 2500

    beforeEach(() => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          id: 10,
          quantity: 10,
          price: 500,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }),
        baseOrderProduct({
          id: 20,
          product_id: 200,
          name: "Товар Б",
          quantity: 10,
          price: 300,
          reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 2, warehouse_id: 1, quantity: 0 }],
        }),
      ] as any);
    });

    it("subtotal = 2500 (5×500 + 0×300)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 2500 }),
      );
    });

    it("товар А обновляется, товар Б удаляется", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledTimes(1);
      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ quantity: 5 }),
      );
      expect(mockOrderProductService.remove).toHaveBeenCalledWith(20);
    });

    it("освобождаются резервы обоих (5 + 10)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledTimes(2);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(2, 10);
    });
  });

  // ─── H. Доставка курьером ─────────────────────────────

  describe("H. Доставка курьером", () => {
    // Предусловие: method_receipt = "courier", delivery_price = 100, дефицит 10 → 5
    // subtotal = 2500, delivery = 100 → total = 2600

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({ method_receipt: "courier", delivery_price: 100 }) as any,
      );
    });

    it("subtotal=2500, delivery=100 → total=2600", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 2500, total: 2600 }),
      );
    });
  });

  // ─── I. Скидка на корзину ──────────────────────────────

  describe("I. Скидка на корзину (10%)", () => {
    // Предусловие: discount_percent=10, дефицит 10 → 5
    // subtotal=2500, discount=round(2500×10/100)=250, total=2250

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ discount_percent: 10 }) as any);
    });

    it("subtotal=2500, discount=round(2500×10/100)=250, total=2250", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subtotal: 2500,
          discount_total: 250,
          total: 2250,
        }),
      );
    });
  });

  // ─── J. Скидка за количество (discount_quantity) ───────

  describe("J. Скидка за количество (discount_quantity)", () => {
    // Предусловие: подписка за количество ненулевая.
    //   Исходный заказ: subtotal=5000, discount_quantity=500, total=4500,
    //   discount_total=0, pickup (delivery=0) → oldOpticSum = 4500.
    //   shortage 10 → 5: newSubtotal = 2500.
    //   newDiscountQuantity = round(500 × 2500/4500) = 278.
    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({
          subtotal: 5000,
          discount_quantity: 500,
          discount_total: 0,
          total: 4500,
        }) as any,
      );
    });

    it("пересчитывается пропорционально уменьшению (500 → 278)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subtotal: 2500,
          discount_quantity: 278,
        }),
      );
    });

    it("при полном удалении товара (кол-во → 0) → discount_quantity = 0", async () => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 0 }],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subtotal: 0,
          discount_quantity: 0,
        }),
      );

      expect(mockOrderProductService.remove).toHaveBeenCalledWith(10);
    });
  });

  // ─── K. Мутабельность reservations ─────────────────────

  describe("K. Мутабельность reservations", () => {
    // releaseExcessReservations мутирует объекты reservations.
    // Тест проверяет что findAll возвращает свежие копии
    // и мок не зависит от предыдущих вызовов.

    it("повторный вызов работает с чистыми данными", async () => {
      mockOrderProductService.findAll.mockImplementation(async () => [
        baseOrderProduct({
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);

      // Второй вызов — мок создаёт НОВЫЙ объект с новым массивом reservations
      jest.clearAllMocks();
      mockOrderProductService.update.mockResolvedValue({} as any);
      mockProductStockService.decrementReserved.mockResolvedValue({} as any);
      mockOrdersRepository.update.mockResolvedValue({} as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
    });
  });

  // ─── L. Резервы с нескольких складов ─────────────────────

  describe("L. Резервы с нескольких складов", () => {
    // docs 1.9/1.10/2.6: дефицит может затрагивать несколько складов
    // одного товара — освобождается каждый склад из shortage_stocks

    it("уменьшает частично со второго склада (30 → 25)", async () => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 30,
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 10 },
          ],
          shortage_stocks: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 5 },
          ],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      // освобождается только второй склад (10 → 5)
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledTimes(1);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(2, 5);

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          quantity: 25,
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 5 },
          ],
        }),
      );

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 12500, total: 12500 }),
      );
    });

    it("полностью освобождает последний склад (30 → 20)", async () => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 30,
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 10 },
          ],
          shortage_stocks: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 0 },
          ],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(2, 10);
      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          quantity: 20,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 20 }],
        }),
      );

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 10000, total: 10000 }),
      );
    });

    it("три склада — два последних освобождаются полностью (50 → 20)", async () => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 50,
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 15 },
            { stock_id: 3, warehouse_id: 3, quantity: 15 },
          ],
          shortage_stocks: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 0 },
            { stock_id: 3, warehouse_id: 3, quantity: 0 },
          ],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledTimes(2);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(3, 15);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(2, 15);

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          quantity: 20,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 20 }],
        }),
      );
    });
  });

  // ─── M. Все товары → 0 (docs 1.6) ───────────────────────

  describe("M. Все товары → 0", () => {
    beforeEach(() => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          id: 10,
          quantity: 10,
          price: 500,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 0 }],
        }),
        baseOrderProduct({
          id: 20,
          product_id: 200,
          name: "Товар Б",
          quantity: 10,
          price: 300,
          reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 2, warehouse_id: 1, quantity: 0 }],
        }),
      ] as any);
    });

    it("все строки удаляются, subtotal = 0, total = 0", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.remove).toHaveBeenCalledWith(10);
      expect(mockOrderProductService.remove).toHaveBeenCalledWith(20);
      expect(mockOrderProductService.remove).toHaveBeenCalledTimes(2);
      expect(mockOrderProductService.update).not.toHaveBeenCalled();

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 0, discount_total: 0, total: 0 }),
      );
    });

    it("освобождаются все резервы", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 10);
      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(2, 10);
    });
  });

  // ─── N. Все товары → 0, доставка курьером ────────────────

  describe("N. Все товары → 0, доставка курьером", () => {
    // total = delivery_price, если остался только курьер
    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({ method_receipt: "courier", delivery_price: 100 }) as any,
      );
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 0 }],
        }) as any,
      ]);
    });

    it("subtotal = 0, total = 100 (только доставка)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 0, total: 100 }),
      );
    });
  });

  // ─── O. Курьер + скидка (docs 1.8, 6.7) ─────────────────

  describe("O. Курьер + скидка", () => {
    // price=1000, qty=10, shortage → 5, discount_percent=15, delivery=100
    // subtotal = 5000, discount = 750, total = 5000 - 750 + 100 = 4350

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({
          method_receipt: "courier",
          delivery_price: 100,
          discount_percent: 15,
          discount_name: "Акция",
        }) as any,
      );
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          price: 1000,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }) as any,
      ]);
    });

    it("subtotal=5000, discount=750, total=4350", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 5000, discount_total: 750, total: 4350 }),
      );
    });
  });

  // ─── P. Несколько товаров + скидка (docs 1.7) ────────────

  describe("P. Несколько товаров + скидка на корзину (10%)", () => {
    // Товар А: 20×500 → shortage 10 → 10×500 = 5000
    // Товар Б: 30×300 → shortage 15 → 15×300 = 4500
    // subtotal = 9500, discount = 950, total = 8550

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({
          subtotal: 19000,
          discount_percent: 10,
          discount_total: 1900,
          discount_name: "Скидка за объём",
          total: 17100,
        }) as any,
      );
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          id: 10,
          quantity: 20,
          price: 500,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 20 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
        }),
        baseOrderProduct({
          id: 20,
          product_id: 200,
          name: "Товар Б",
          quantity: 30,
          price: 300,
          reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 30 }],
          shortage_stocks: [{ stock_id: 2, warehouse_id: 1, quantity: 15 }],
        }),
      ] as any);
    });

    it("subtotal=9500, discount=950, total=8550", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 9500, discount_total: 950, total: 8550 }),
      );
    });

    it("discount_percent и discount_name не меняются", async () => {
      await service.acceptShortage(1, 1, "user");

      const updateCall = mockOrdersRepository.update.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty("discount_percent");
      expect(updateCall[1]).not.toHaveProperty("discount_name");
    });
  });

  // ─── Q. Дефицит без реального изменения (diff = 0) ──────

  describe("Q. Дефицит без реального изменения (diff = 0)", () => {
    // shortage.quantity == reservation.quantity → количество не меняется,
    // но shortage_stocks очищается, резервы не трогаются

    beforeEach(() => {
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
        }) as any,
      ]);
    });

    it("количество остаётся 10, shortage_stocks очищается", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrderProductService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ quantity: 10, shortage_stocks: [] }),
      );
      expect(mockOrderProductService.remove).not.toHaveBeenCalled();
    });

    it("резервы НЕ освобождаются", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).not.toHaveBeenCalled();
    });

    it("subtotal и total не меняются (5000)", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subtotal: 5000, total: 5000 }),
      );
    });
  });

  // ─── R. Ошибка записи заказа ────────────────────────────

  describe("R. Ошибка записи заказа", () => {
    it("ordersRepository.update rejected → «Не удалось принять изменения по остаткам, ...»", async () => {
      mockOrdersRepository.update.mockRejectedValue(new Error("DB down"));

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        "Не удалось принять изменения по остаткам, DB down",
      );
    });
  });

  // ─── S. Ошибка чтения заказа ────────────────────────────

  describe("S. Ошибка чтения заказа", () => {
    it("ordersRepository.findOne rejected → «Не удалось получить заказ, ...»", async () => {
      mockOrdersRepository.findOne.mockRejectedValue(new Error("connection lost"));

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        "Не удалось получить заказ, connection lost",
      );
    });
  });

  // ─── T. cleanupTransfers (статус processing) ─────────────

  describe("T. cleanupTransfers (статус processing)", () => {
    // docs 2.1–2.6: transfer'ы со складов, которые полностью
    // освобождены дефицитом, удаляются; остальные не трогаются

    it("transfer со склада в активных резервах — остаётся", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status: "processing" }) as any);
      mockTransfersService.findByOrderId.mockResolvedValue([
        { id: 1, status: "processing", type: "transfer", from_warehouse: { id: 1 } },
      ] as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockTransfersService.remove).not.toHaveBeenCalled();
    });

    it("transfer со склада, который полностью освобождён, — удаляется", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status: "processing" }) as any);
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 30,
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 10 },
          ],
          shortage_stocks: [
            { stock_id: 1, warehouse_id: 1, quantity: 20 },
            { stock_id: 2, warehouse_id: 2, quantity: 0 },
          ],
        }) as any,
      ]);
      mockTransfersService.findByOrderId.mockResolvedValue([
        { id: 1, status: "processing", type: "transfer", from_warehouse: { id: 1 } },
        { id: 2, status: "processing", type: "transfer", from_warehouse: { id: 2 } },
      ] as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockTransfersService.remove).toHaveBeenCalledTimes(1);
      expect(mockTransfersService.remove).toHaveBeenCalledWith(2);
    });

    it("transfer не в статусе processing — не трогается", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status: "processing" }) as any);
      mockTransfersService.findByOrderId.mockResolvedValue([
        { id: 1, status: "completed", type: "transfer", from_warehouse: { id: 1 } },
      ] as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockTransfersService.remove).not.toHaveBeenCalled();
    });

    it("delivery transfer — не трогается", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status: "processing" }) as any);
      mockTransfersService.findByOrderId.mockResolvedValue([
        { id: 1, status: "processing", type: "delivery", from_warehouse: { id: 1 } },
      ] as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockTransfersService.remove).not.toHaveBeenCalled();
    });

    it("transfer без from_warehouse — пропускается", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status: "processing" }) as any);
      mockTransfersService.findByOrderId.mockResolvedValue([
        { id: 1, status: "processing", type: "transfer", from_warehouse: null },
      ] as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockTransfersService.remove).not.toHaveBeenCalled();
    });
  });

  // ─── U. Повторный вызов (docs 6.4) ──────────────────────

  describe("U. Повторный вызов после принятия", () => {
    it("второй вызов → «Нет изменений по остаткам для принятия»", async () => {
      await service.acceptShortage(1, 1, "user");

      // дефицит уже очищен — findAll возвращает товар без shortage
      mockOrderProductService.findAll.mockResolvedValue([baseOrderProduct()] as any);

      await expect(service.acceptShortage(1, 1, "user")).rejects.toBe(
        "Нет изменений по остаткам для принятия",
      );
    });
  });

  // ─── V. Округление скидки ───────────────────────────────

  describe("V. Округление скидки", () => {
    it("discount_total округляется (2505 × 10% = 250.5 → 251)", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ discount_percent: 10 }) as any);
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          quantity: 10,
          price: 501,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }) as any,
      ]);

      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subtotal: 2505, // 5 × 501
          discount_total: 251, // round(2505 × 10 / 100) = round(250.5)
          total: 2254, // 2505 - 251
        }),
      );
    });
  });
});