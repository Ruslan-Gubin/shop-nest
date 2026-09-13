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
import { PaymentsService } from "src/payments/payments.service";

// ─── Гейты: пока у заказа есть дефицит (hasShortage), flow блокируется ──
// docs, раздел 7: change-status и ship не работают, пока клиент не принял
// изменения по остаткам.

describe("OrdersService — shortage-гейты (ship, changeStatus)", () => {
  const baseOrder = (overrides?: Record<string, any>) => ({
    id: 1,
    status: "new",
    create_user_id: 1,
    method_receipt: "pickup",
    warehouse: { id: 1 },
    address: { id: 1 },
    ...overrides,
  });

  let service: OrdersService;

  const mockOrdersRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderProductService = {
    hasShortage: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockTransfersService = {
    create: jest.fn(),
    remove: jest.fn(),
    findByOrderId: jest.fn(),
    updateStatusByOrderAndType: jest.fn(),
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
        { provide: TransfersService, useValue: mockTransfersService },
        { provide: PaymentsService, useValue: { createPayment: jest.fn(), findByOrder: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();

    mockOrdersRepository.findOne.mockResolvedValue(baseOrder() as any);
    mockOrdersRepository.update.mockResolvedValue({} as any);
    mockOrderProductService.hasShortage.mockResolvedValue(false);
  });

  describe("ship", () => {
    it("блокируется, пока есть дефицит", async () => {
      mockOrderProductService.hasShortage.mockResolvedValue(true);

      await expect(
        service.ship({ transfers: [{ order_id: 1 }], reservations: [] } as any),
      ).rejects.toBe("Заказ 1 ожидает решения клиента по изменению количества товаров в заказе");

      expect(mockTransfersService.create).not.toHaveBeenCalled();
    });

    it("без order_id в transfers → «Заказ undefined не найден»", async () => {
      await expect(service.ship({ transfers: [], reservations: [] } as any)).rejects.toBe(
        "Заказ undefined не найден",
      );

      expect(mockOrderProductService.hasShortage).not.toHaveBeenCalled();
    });
  });

  describe("changeStatus", () => {
    it("блокируется, пока есть дефицит", async () => {
      mockOrderProductService.hasShortage.mockResolvedValue(true);

      await expect(service.changeStatus(1)).rejects.toBe(
        "Заказ ожидает решения клиента по изменению количества товара в заказе",
      );

      expect(mockOrdersRepository.update).not.toHaveBeenCalled();
    });

    it("new → processing без дефицита — работает", async () => {
      await service.changeStatus(1);

      expect(mockOrdersRepository.update).toHaveBeenCalledWith(1, { status: "processing" });
    });
  });
});