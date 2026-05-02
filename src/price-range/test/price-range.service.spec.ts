import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PriceRangeService } from "../price-range.service";
import { PriceRange } from "../entities/price-range.entity";
import { CreatePriceRangeDto } from "../dto/create-price-range.dto";
import { UpdatePriceRangeDto } from "../dto/update-price-range.dto";

describe("PriceRangeService", () => {
  let service: PriceRangeService;
  let repository: jest.Mocked<Repository<PriceRange>>;

  const mockRange: PriceRange = {
    id: 1,
    price_from: 0,
    price_to: 99,
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

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
        PriceRangeService,
        {
          provide: getRepositoryToken(PriceRange),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PriceRangeService>(PriceRangeService);
    repository = module.get<jest.Mocked<Repository<PriceRange>>>(getRepositoryToken(PriceRange));

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("должен создать диапазон", async () => {
      const createDto: CreatePriceRangeDto = { price_from: 0, price_to: 99 };
      mockRepository.find.mockResolvedValue([]);
      mockRepository.save.mockResolvedValue(mockRange);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRange);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });

    it("должен выбросить ошибку если price_to <= price_from", async () => {
      const createDto: CreatePriceRangeDto = { price_from: 100, price_to: 99 };

      await expect(service.create(createDto)).rejects.toBe(
        "Цена 'до' должна быть больше цены 'от'",
      );
    });

    it("должен выбросить ошибку при пересечении диапазонов", async () => {
      const createDto: CreatePriceRangeDto = { price_from: 50, price_to: 150 };
      mockRepository.find.mockResolvedValue([mockRange]);

      await expect(service.create(createDto)).rejects.toBe(
        "Диапазон пересекается с существующим [0 - 99]",
      );
    });
  });

  describe("findAll", () => {
    it("должен вернуть все диапазоны отсортированные по price_from", async () => {
      const ranges = [
        { ...mockRange, id: 1, price_from: 0, price_to: 99 },
        { ...mockRange, id: 2, price_from: 100, price_to: 499 },
      ];
      mockRepository.find.mockResolvedValue(ranges);

      const result = await service.findAll();

      expect(result).toEqual(ranges);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { price_from: "ASC" },
      });
    });
  });

  describe("findOne", () => {
    it("должен вернуть диапазон по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockRange);

      const result = await service.findOne(1);

      expect(result).toEqual(mockRange);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("должен обновить диапазон", async () => {
      const updateDto: UpdatePriceRangeDto = { price_from: 0, price_to: 199 };
      mockRepository.findOne.mockResolvedValue(mockRange);
      mockRepository.find.mockResolvedValue([mockRange]);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it("должен выбросить ошибку при невалидном обновлении", async () => {
      const updateDto: UpdatePriceRangeDto = { price_from: 200, price_to: 100 };
      mockRepository.findOne.mockResolvedValue(mockRange);

      await expect(service.update(1, updateDto)).rejects.toBe(
        "Цена 'до' должна быть больше цены 'от'",
      );
    });
  });

  describe("remove", () => {
    it("должен удалить диапазон", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("CASCADE delete", () => {
    it("при удалении диапазона связанные правила автозаполнения удаляются автоматически", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      // При ON DELETE CASCADE БД сама удалит связанные PriceFill
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});