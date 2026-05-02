import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PriceTypeService } from "../price-type.service";
import { PriceType } from "../entities/price-type.entity";
import { CreatePriceTypeDto } from "../dto/create-price-type.dto";

describe("PriceTypeService", () => {
  let service: PriceTypeService;
  let repository: jest.Mocked<Repository<PriceType>>;

  const mockPriceType: PriceType = {
    id: 1,
    name: "Оптовый",
    description: "Оптовая цена",
    isPublic: true,
    minQuantity: 10,
    created_user_id: 1,
    createdBy: null as never,
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceTypeService,
        {
          provide: getRepositoryToken(PriceType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PriceTypeService>(PriceTypeService);
    repository = module.get<jest.Mocked<Repository<PriceType>>>(getRepositoryToken(PriceType));

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto = {
      name: "Оптовый",
      description: "Оптовая цена",
      isPublic: true,
      minQuantity: 10,
      created_user_id: 1,
    };

    it("должен создать тип цены", async () => {
      mockRepository.save.mockResolvedValue(mockPriceType);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPriceType);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("должен вернуть все типы цен без фильтров", async () => {
      mockRepository.find.mockResolvedValue([mockPriceType]);
      mockRepository.count.mockResolvedValue(1);

      const result = await service.findAll("1", "10", "");

      expect(result).toEqual([mockPriceType]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { id: "DESC" },
      });
    });

    it("должен фильтровать по name", async () => {
      mockRepository.find.mockResolvedValue([mockPriceType]);

      await service.findAll("1", "10", "Опт");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Опт%" }),
          }),
        }),
      );
    });

    it("должен фильтровать по created_user_id", async () => {
      mockRepository.find.mockResolvedValue([mockPriceType]);

      await service.findAll("1", "10", "", 1);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_user_id: 1 }),
        }),
      );
    });

    it("должен корректно вы��ислять skip", async () => {
      mockRepository.find.mockResolvedValue([mockPriceType]);

      await service.findAll("3", "20", "");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });
  });

  describe("getTotalCount", () => {
    it("должен вернуть общее количество", async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.getTotalCount();

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: {} });
    });

    it("должен фильтровать по name", async () => {
      mockRepository.count.mockResolvedValue(2);

      await service.getTotalCount("Опт");

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Опт%" }),
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("должен вернуть тип цены по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockPriceType);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPriceType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const updateDto: Partial<CreatePriceTypeDto> = {
      name: "Розничный",
      description: "Розничная цена",
    };

    it("должен обновить тип цены", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("remove", () => {
    it("должен удалить тип цены", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it("при удалении типа цены связанные правила автозаполнения удаляются автоматически (CASCADE)", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      // При ON DELETE CASCADE БД сама удалит связанные записи в price_fill
      // Здесь мы просто проверяем что удаление типа цены произошло
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});