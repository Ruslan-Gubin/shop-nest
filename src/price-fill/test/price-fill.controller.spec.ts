import { Test, TestingModule } from "@nestjs/testing";
import { PriceFillController } from "../price-fill.controller";
import { PriceFillService } from "../price-fill.service";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { PriceFill } from "../entities/price-fill.entity";

describe("PriceFillController", () => {
  let controller: PriceFillController;
  let service: jest.Mocked<PriceFillService>;

  const mockPriceFill: PriceFill = {
    id: 1,
    price_type_id: 1,
    price_range_id: 1,
    percent: 100,
    created_at: new Date("2024-01-01"),
    updated_at: null,
    price_type: null as never,
    price_range: null as never,
  };

  const mockPriceFillService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceFillController],
      providers: [
        {
          provide: PriceFillService,
          useValue: mockPriceFillService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PriceFillController>(PriceFillController);
    service = module.get<PriceFillService>(PriceFillService) as jest.Mocked<PriceFillService>;

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("должен создать правило автозаполнения", async () => {
      const createDto = {
        price_type_id: 1,
        price_range_id: 1,
        percent: 100,
      };

      mockPriceFillService.create.mockResolvedValue(mockPriceFill);

      const result = await controller.create(createDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Правила автозаполнения успешно добавлено");
      expect(result.data).toEqual(mockPriceFill);
      expect(mockPriceFillService.create).toHaveBeenCalledWith(createDto);
    });

    it("должен вернуть ошибку при создании", async () => {
      const createDto = {
        price_type_id: 1,
        price_range_id: 1,
        percent: 100,
      };

      mockPriceFillService.create.mockRejectedValue(new Error("DB error"));

      const result = await controller.create(createDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAll", () => {
    it("должен вернуть список всех правил", async () => {
      mockPriceFillService.findAll.mockResolvedValue([mockPriceFill]);

      const result = await controller.findAll();

      expect(result.status).toBe("success");
      expect(result.data).toEqual([mockPriceFill]);
      expect(result.message).toBe("Список правил автозаполнения получен");
      expect(mockPriceFillService.findAll).toHaveBeenCalledWith();
    });

    it("должен вернуть ошибку при получении списка", async () => {
      mockPriceFillService.findAll.mockRejectedValue(new Error("DB error"));

      const result = await controller.findAll();

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findOne", () => {
    it("должен вернуть правило по id", async () => {
      mockPriceFillService.findOne.mockResolvedValue(mockPriceFill);

      const result = await controller.findOne("1");

      expect(result.status).toBe("success");
      expect(result.data).toEqual(mockPriceFill);
      expect(result.message).toBe("Правила автозаполнения получено");
      expect(mockPriceFillService.findOne).toHaveBeenCalledWith(1);
    });

    it("должен вернуть null если правило не найдено", async () => {
      mockPriceFillService.findOne.mockResolvedValue(null);

      const result = await controller.findOne("999");

      expect(result.status).toBe("success");
      expect(result.data).toBeNull();
    });

    it("должен вернуть ошибку при поиске", async () => {
      mockPriceFillService.findOne.mockRejectedValue(new Error("DB error"));

      const result = await controller.findOne("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("update", () => {
    it("должен обновить правило", async () => {
      const updateDto = {
        price_type_id: 1,
        price_range_id: 1,
        percent: 90,
      };

      mockPriceFillService.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Правила автозаполнения успешно обновлено");
      expect(mockPriceFillService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it("должен вернуть ошибку при обновлении", async () => {
      const updateDto = {
        price_type_id: 1,
        price_range_id: 1,
        percent: 90,
      };

      mockPriceFillService.update.mockRejectedValue(new Error("DB error"));

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("remove", () => {
    it("должен удалить правило", async () => {
      mockPriceFillService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove("1");

      expect(result.status).toBe("success");
      expect(result.message).toBe("Правила автозаполнения успешно удалено");
      expect(mockPriceFillService.remove).toHaveBeenCalledWith(1);
    });

    it("должен вернуть ошибку при удалении", async () => {
      mockPriceFillService.remove.mockRejectedValue(new Error("DB error"));

      const result = await controller.remove("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });
});