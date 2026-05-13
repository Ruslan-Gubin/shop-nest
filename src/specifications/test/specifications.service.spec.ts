import { Test, TestingModule } from "@nestjs/testing";
import { SpecificationsService } from "../specifications.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Specification } from "../entities/specification.entity";
import { CreateSpecificationDto } from "../dto/create-specification.dto";

describe("SpecificationsService", () => {
  let service: SpecificationsService;
  let repository: jest.Mocked<Repository<Specification>>;

  const mockSpecification: Specification = {
    id: 1,
    name: "Материал",
    type: "text",
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
        SpecificationsService,
        {
          provide: getRepositoryToken(Specification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SpecificationsService>(SpecificationsService);
    repository = module.get<jest.Mocked<Repository<Specification>>>(getRepositoryToken(Specification));

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreateSpecificationDto = {
      name: "Материал",
      type: "text",
      created_user_id: 1,
    };

    it("должен создать характеристику", async () => {
      mockRepository.save.mockResolvedValue(mockSpecification);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSpecification);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("должен вернуть все характеристики без фильтров", async () => {
      mockRepository.find.mockResolvedValue([mockSpecification]);

      const result = await service.findAll("1", "10", "");

      expect(result).toEqual([mockSpecification]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { id: "DESC" },
      });
    });

    it("должен фильтровать по name", async () => {
      mockRepository.find.mockResolvedValue([mockSpecification]);

      await service.findAll("1", "10", "Мате");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Мате%" }),
          }),
        }),
      );
    });

    it("должен фильтровать по created_user_id", async () => {
      mockRepository.find.mockResolvedValue([mockSpecification]);

      await service.findAll("1", "10", "", 1);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_user_id: 1 }),
        }),
      );
    });

    it("должен корректно вычислять skip", async () => {
      mockRepository.find.mockResolvedValue([mockSpecification]);

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

      await service.getTotalCount("Мате");

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Мате%" }),
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("должен вернуть характеристику по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecification);

      const result = await service.findOne(1);

      expect(result).toEqual(mockSpecification);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const updateDto: Partial<CreateSpecificationDto> = {
      name: "Цвет",
      type: "color",
    };

    it("должен обновить характеристику", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("remove", () => {
    it("должен удалить характеристику", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
