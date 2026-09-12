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

describe("OrdersService — setShortageStocks", () => {
  const baseOrder = (overrides?: Record<string, any>) => ({
    id: 1,
    status: "new",
    ...overrides,
  });

  const items = [
    { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
  ] as const;

  let service: OrdersService;

  const mockOrdersRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderProductService = {
    setShortageStocks: jest.fn(),
    findAll: jest.fn(),
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
        { provide: ProductStockService, useValue: {} },
        { provide: WarehouseService, useValue: {} },
        { provide: TransfersService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();

    mockOrdersRepository.findOne.mockResolvedValue(baseOrder() as any);
    mockOrderProductService.setShortageStocks.mockResolvedValue({} as any);
  });

  // ─── A. Валидация заказа ───────────────────────────────

  describe("A. Валидация заказа", () => {
    it("заказ не найден → ошибка", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(null);

      await expect(service.setShortageStocks(999, [...items])).rejects.toBe("Заказ 999 не найден");

      expect(mockOrderProductService.setShortageStocks).not.toHaveBeenCalled();
    });

    it.each([
      "ready",
      "in_delivery",
      "completed",
      "cancelled_new",
      "cancelled_assembly",
      "cancelled_ready",
      "cancelled_delivery",
      "cancelled_customer",
    ])("статус «%s» → ошибка", async (status) => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status }) as any);

      await expect(service.setShortageStocks(1, [...items])).rejects.toBe(
        `Невозможно установить дефицит для заказа в статусе ${status}`,
      );

      expect(mockOrderProductService.setShortageStocks).not.toHaveBeenCalled();
    });

    it.each(["new", "processing"])("статус «%s» → ок", async (status) => {
      mockOrdersRepository.findOne.mockResolvedValue(baseOrder({ status }) as any);

      await expect(service.setShortageStocks(1, [...items])).resolves.toBeUndefined();

      expect(mockOrderProductService.setShortageStocks).toHaveBeenCalledTimes(1);
    });
  });

  // ─── B. Делегирование в OrderProductService ─────────────

  describe("B. Делегирование в OrderProductService", () => {
    it("передаёт items без изменений", async () => {
      const fullItems = [
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
        { id: 20, stock_id: 2, warehouse_id: 1, quantity: 0 },
      ];

      await service.setShortageStocks(1, fullItems);

      expect(mockOrderProductService.setShortageStocks).toHaveBeenCalledWith(fullItems);
    });

    it("идемпотентен: не обновляет сам заказ", async () => {
      await service.setShortageStocks(1, [...items]);

      expect(mockOrdersRepository.update).not.toHaveBeenCalled();
    });

    it("пробрасывает ошибку из orderProductService", async () => {
      mockOrderProductService.setShortageStocks.mockRejectedValue(
        "Товар заказа с ID 999 не найден.",
      );

      await expect(service.setShortageStocks(1, [...items])).rejects.toBe(
        "Товар заказа с ID 999 не найден.",
      );
    });

    it("не меняет статус заказа при успехе", async () => {
      await service.setShortageStocks(1, [...items]);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it("ordersRepository.findOne rejected → «Не удалось получить заказ, ...»", async () => {
      mockOrdersRepository.findOne.mockRejectedValue(new Error("connection lost"));

      await expect(service.setShortageStocks(1, [...items])).rejects.toBe(
        "Не удалось получить заказ, connection lost",
      );
    });
  });
});