import { Test, TestingModule } from "@nestjs/testing";
import { PriceRangeController } from "../price-range.controller";
import { PriceRangeService } from "../price-range.service";
import { PriceRange } from "../entities/price-range.entity";

describe("PriceRangeController", () => {
  let controller: PriceRangeController;
  let service: jest.Mocked<PriceRangeService>;

  const mockRange: PriceRange = {
    id: 1,
    price_from: 0,
    price_to: 99,
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceRangeController],
      providers: [
        {
          provide: PriceRangeService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PriceRangeController>(PriceRangeController);
    service = module.get<PriceRangeService>(PriceRangeService) as jest.Mocked<PriceRangeService>;

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("должен создать диапазон", async () => {
      const createDto = { price_from: 0, price_to: 99 };
      mockService.create.mockResolvedValue(mockRange);

      const result = await controller.create(createDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Диапазон успешно добавлен");
      expect(result.data).toEqual(mockRange);
    });

    it("должен вернуть ошибку при создании", async () => {
      const createDto = { price_from: 100, price_to: 99 };
      mockService.create.mockRejectedValue(new Error("Validation error"));

      const result = await controller.create(createDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAll", () => {
    it("должен вернуть все диапазоны", async () => {
      const ranges = [mockRange];
      mockService.findAll.mockResolvedValue(ranges);

      const result = await controller.findAll("");

      expect(result.status).toBe("success");
      expect(result.data).toEqual(ranges);
    });

    it("должен вернуть ошибку при получении", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));

      const result = await controller.findAll("");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findOne", () => {
    it("должен вернуть диапазон по id", async () => {
      mockService.findOne.mockResolvedValue(mockRange);

      const result = await controller.findOne("1");

      expect(result.status).toBe("success");
      expect(result.data).toEqual(mockRange);
    });

    it("должен вернуть ошибку при поиске", async () => {
      mockService.findOne.mockRejectedValue(new Error("DB error"));

      const result = await controller.findOne("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("update", () => {
    it("должен обновить диапазон", async () => {
      const updateDto = { price_from: 0, price_to: 199 };
      mockService.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Диапазон успешно обновлён");
    });

    it("должен вернуть ошибку при обновлении", async () => {
      const updateDto = { price_from: 0, price_to: 199 };
      mockService.update.mockRejectedValue(new Error("DB error"));

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("remove", () => {
    it("должен удалить диапазон", async () => {
      mockService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove("1");

      expect(result.status).toBe("success");
      expect(result.message).toBe("Диапазон успешно удалён");
    });

    it("должен вернуть ошибку при удалении", async () => {
      mockService.remove.mockRejectedValue(new Error("DB error"));

      const result = await controller.remove("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });
});