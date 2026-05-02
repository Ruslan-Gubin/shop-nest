import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { PromotionsService } from "../promotions.service";
import { Promotion } from "../entities/promotion.entity";
import { CreatePromotionDto } from "../dto/create-promotion.dto";
import { UpdatePromotionDto } from "../dto/update-promotion.dto";

describe("PromotionsService", () => {
  let service: PromotionsService;
  let repository: jest.Mocked<Repository<Promotion>>;

  const mockPromotion: Promotion = {
    id: 1,
    name: "Новогодняя скидка",
    description: "Скидка 20% на все товары",
    percent: 20,
    date_from: new Date("2024-01-01"),
    date_to: new Date("2024-01-31"),
    is_active: true,
    created_user_id: 1,
    createdBy: null as never,
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

  const createMockQueryBuilder = () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<Promotion>>;
    return queryBuilder;
  };

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    repository = module.get<jest.Mocked<Repository<Promotion>>>(getRepositoryToken(Promotion));

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreatePromotionDto = {
      name: "Новогодняя скидка",
      description: "Скидка 20% на все товары",
      percent: 20,
      date_from: "2024-01-01",
      date_to: "2024-01-31",
      is_active: true,
      created_user_id: 1,
    };

    it("должен создать акцию", async () => {
      const queryBuilder = createMockQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockRepository.save.mockResolvedValue(mockPromotion);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPromotion);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });

    it("должен выбросить ошибку при перекрывающихся датах", async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getMany.mockResolvedValue([mockPromotion]);
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(service.create(createDto)).rejects.toBe("Даты акции перекрываются с существующей активной акцией");
    });
  });

  describe("findAll", () => {
    it("должен вернуть все акции без фильтров", async () => {
      mockRepository.find.mockResolvedValue([mockPromotion]);

      const result = await service.findAll("1", "10", "");

      expect(result).toEqual([mockPromotion]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { created_at: "DESC" },
      });
    });

    it("должен фильтровать по name", async () => {
      mockRepository.find.mockResolvedValue([mockPromotion]);

      await service.findAll("1", "10", "Новогодняя");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Новогодняя%" }),
          }),
        }),
      );
    });

    it("должен фильтровать по created_user_id", async () => {
      mockRepository.find.mockResolvedValue([mockPromotion]);

      await service.findAll("1", "10", "", 1);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_user_id: 1 }),
        }),
      );
    });

    it("должен корректно вычислять skip", async () => {
      mockRepository.find.mockResolvedValue([mockPromotion]);

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

      await service.getTotalCount("Новогодняя");

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Новогодняя%" }),
          }),
        }),
      );
    });

    it("должен фильтровать по created_user_id", async () => {
      mockRepository.count.mockResolvedValue(1);

      await service.getTotalCount("", 1);

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_user_id: 1 }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("должен вернуть акцию по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockPromotion);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPromotion);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("findActive", () => {
    it("должен вернуть активные акции", async () => {
      mockRepository.find.mockResolvedValue([mockPromotion]);

      const result = await service.findActive();

      expect(result).toEqual([mockPromotion]);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date_from: expect.any(Object),
            date_to: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("update", () => {
    const updateDto: UpdatePromotionDto = {
      name: "Летняя скидка",
      percent: 30,
    };

    it("должен обновить акцию", async () => {
      const queryBuilder = createMockQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it("должен проверять перекрытие дат при обновлении", async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getMany.mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const updateDtoWithDates: UpdatePromotionDto = {
        date_from: "2024-02-01",
        date_to: "2024-02-28",
      };

      await service.update(1, updateDtoWithDates);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("promotion");
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("должен удалить акцию", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});