import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PriceFillService } from "../price-fill.service";
import { PriceFill } from "../entities/price-fill.entity";
import { CreatePriceFillDto } from "../dto/create-price-fill.dto";
import { UpdatePriceFillDto } from "../dto/update-price-fill.dto";

describe("PriceFillService", () => {
  let service: PriceFillService;
  let repository: jest.Mocked<Repository<PriceFill>>;

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
        PriceFillService,
        {
          provide: getRepositoryToken(PriceFill),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PriceFillService>(PriceFillService);
    repository = module.get<jest.Mocked<Repository<PriceFill>>>(getRepositoryToken(PriceFill));

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreatePriceFillDto = {
      price_type_id: 1,
      price_range_id: 1,
      percent: 100,
    };

    it("должен создать правило автозаполнения", async () => {
      mockRepository.save.mockResolvedValue(mockPriceFill);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPriceFill);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("должен вернуть все правила", async () => {
      mockRepository.find.mockResolvedValue([mockPriceFill]);

      const result = await service.findAll();

      expect(result).toEqual([mockPriceFill]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { id: "DESC" },
      });
    });
  });

  describe("findOne", () => {
    it("должен вернуть правило по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockPriceFill);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPriceFill);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const updateDto: UpdatePriceFillDto = {
      percent: 90,
    };

    it("должен обновить правило", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("remove", () => {
    it("должен удалить правило", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});