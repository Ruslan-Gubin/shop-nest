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

// ─── Тесты ─────────────────────────────────────────────────

describe("OrdersService — acceptShortage", () => {
  const baseOrder = (overrides?: Record<string, any>) => ({
    id: 1,
    status: "new",
    shortage_stocks: [{ id: 10, quantity: 5 }],
    create_user_id: 1,
    subtotal: 5000,
    discount_percent: 0,
    discount_total: 0,
    discount_name: "",
    discount_quantity: 0,
    total: 5000,
    method_receipt: "pickup",
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

    mockOrdersRepository.findOne.mockResolvedValue(baseOrder() as any);
    mockOrdersRepository.update.mockResolvedValue({} as any);
    mockOrderProductService.update.mockResolvedValue({} as any);
    mockOrderProductService.remove.mockResolvedValue({} as any);
    mockOrderProductService.findAll.mockResolvedValue([baseOrderProduct()] as any);
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

    it("shortage_stocks пустой → ошибка", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ shortage_stocks: [] }) as any);

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
    // shortage_stocks: [{ id:10, quantity:5 }]

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

    it("shortage_stocks очищается", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ shortage_stocks: [] }),
      );
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
    // Предусловие: shortage_stocks: [{ id:10, quantity:0 }]
    // Ожидание: quantity=0, subtotal=0, total=0, все резервы освобождены

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({ shortage_stocks: [{ id: 10, quantity: 0 }] }) as any,
      );
    });

    it("quantity = 0, subtotal = 0, discount_total = 0, total = 0", async () => {
      await service.acceptShortage(1, 1, "user");

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subtotal: 0,
          discount_total: 0,
          total: 0,
          shortage_stocks: [],
        }),
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
    //   Товар А (id:10): qty=10, price=500, shortage → 5
    //   Товар Б (id:20): qty=10, price=300, БЕЗ дефицита
    //
    // Ожидание:
    //   Товар А: обновлён до qty=5
    //   Товар Б: НЕ обновлён, остался qty=10
    //   subtotal = 5×500 + 10×300 = 5500

    const orderProductA = baseOrderProduct({ id: 10, product_id: 100, quantity: 10, price: 500 });
    const orderProductB = baseOrderProduct({
      id: 20,
      product_id: 200,
      name: "Товар Б",
      quantity: 10,
      price: 300,
    });

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({ shortage_stocks: [{ id: 10, quantity: 5 }] }) as any,
      );
      mockOrderProductService.findAll.mockResolvedValue([
        { ...orderProductA, reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }] },
        { ...orderProductB, reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }] },
      ]);
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
    //   Товар А (id:10): qty=10, price=500, shortage → 5
    //   Товар Б (id:20): qty=10, price=300, shortage → 0
    //
    // Ожидание:
    //   subtotal = 5×500 + 0×300 = 2500

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({
          shortage_stocks: [
            { id: 10, quantity: 5 },
            { id: 20, quantity: 0 },
          ],
        }) as any,
      );
      mockOrderProductService.findAll.mockResolvedValue([
        baseOrderProduct({
          id: 10,
          quantity: 10,
          price: 500,
          reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
        }),
        baseOrderProduct({
          id: 20,
          product_id: 200,
          name: "Товар Б",
          quantity: 10,
          price: 300,
          reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 10 }],
        }),
      ]);
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
    // Предусловие: method_receipt = "courier", shortage → 5
    // subtotal = 2500, delivery = 100 → total = 2600

    beforeEach(() => {
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({ method_receipt: "courier" }) as any,
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
    // Предусловие: discount_percent=10, shortage → 5
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
    //   shortage → 5: newSubtotal = 2500.
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
      mockOrdersRepository.findOne.mockResolvedValue(
        baseOrder({
          subtotal: 5000,
          discount_quantity: 500,
          discount_total: 0,
          total: 4500,
          shortage_stocks: [{ id: 10, quantity: 0 }],
        }) as any,
      );

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

  describe("J. Мутабельность reservations", () => {
    // releaseExcessReservations мутирует объекты reservations.
    // Тест проверяет что findAll возвращает свежие копии
    // и мок не зависит от предыдущих вызовов.

    it("повторный вызов работает с чистыми данными", async () => {
      const reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }];
      mockOrderProductService.findAll.mockResolvedValue([baseOrderProduct({ reservations })]);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);

      // Второй вызов — мок возвращает НОВЫЙ объект (findAll пересоздаёт)
      jest.clearAllMocks();
      mockOrderProductService.update.mockResolvedValue({} as any);
      mockProductStockService.decrementReserved.mockResolvedValue({} as any);
      mockOrdersRepository.update.mockResolvedValue({} as any);

      await service.acceptShortage(1, 1, "user");

      expect(mockProductStockService.decrementReserved).toHaveBeenCalledWith(1, 5);
    });
  });
});
