import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OrderProductService } from "../order-product.service";
import { OrderProduct } from "../entities/order-product.entity";

// ─── hasShortage: есть ли в заказе товары с непустым дефицитом ──
// Используется как гейт в ship() и changeStatus() (docs, раздел 7).

describe("OrderProductService — hasShortage", () => {
  let service: OrderProductService;

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProductService,
        { provide: getRepositoryToken(OrderProduct), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OrderProductService>(OrderProductService);

    jest.clearAllMocks();
  });

  it("true, если хотя бы у одного товара shortage_stocks не пустой", async () => {
    mockRepository.find.mockResolvedValue([
      { shortage_stocks: [] },
      { shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }] },
    ] as any);

    await expect(service.hasShortage(1)).resolves.toBe(true);
  });

  it("true, если дефицит у единственного товара", async () => {
    mockRepository.find.mockResolvedValue([
      { shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 0 }] },
    ] as any);

    await expect(service.hasShortage(1)).resolves.toBe(true);
  });

  it("false, если у всех товаров shortage_stocks пустой", async () => {
    mockRepository.find.mockResolvedValue([
      { shortage_stocks: [] },
      { shortage_stocks: [] },
    ] as any);

    await expect(service.hasShortage(1)).resolves.toBe(false);
  });

  it("false, если shortage_stocks не массив (undefined/null)", async () => {
    mockRepository.find.mockResolvedValue([
      { shortage_stocks: undefined },
      { shortage_stocks: null },
    ] as any);

    await expect(service.hasShortage(1)).resolves.toBe(false);
  });

  it("false при ошибке findAll (гейт не роняет flow)", async () => {
    mockRepository.find.mockRejectedValue(new Error("DB down"));

    await expect(service.hasShortage(1)).resolves.toBe(false);
  });
});