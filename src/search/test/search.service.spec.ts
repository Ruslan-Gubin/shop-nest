import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { type Repository } from "typeorm";
import { SearchService } from "../search.service";
import { Search } from "../entities/search.entity";
import { UpdateSearchDto } from "../dto/update-search.dto";

describe("SearchService", () => {
  let service: SearchService;
  let repository: jest.Mocked<Repository<Search>>;

  const mockSearch: Search = {
    id: 1,
    text: "блокнот а5",
    result_count: 24,
    views: 10,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-05-01"),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Search),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    repository = module.get<jest.Mocked<Repository<Search>>>(getRepositoryToken(Search));

    jest.clearAllMocks();
  });

  describe("getSuggestions", () => {
    it("должен вернуть подсказки по префиксу", async () => {
      const suggestions = [mockSearch];
      mockQueryBuilder.getMany.mockResolvedValue(suggestions);

      const result = await service.getSuggestions("блок", 7);

      expect(result).toEqual(suggestions);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("search");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("search.text ILIKE :text", {
        text: "блок%",
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("search.text != :exactText", {
        exactText: "блок",
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("search.result_count > 0");
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(7);
    });

    it("должен выполнить запрос с пустым текстом", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getSuggestions("", 7);

      expect(result).toEqual([]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("search");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("search.text ILIKE :text", {
        text: "%",
      });
    });

    it("должен выполнить запрос с текстом из пробелов", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getSuggestions("   ", 7);

      expect(result).toEqual([]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("search.text ILIKE :text", {
        text: "   %",
      });
    });

    it("должен выбросить ошибку при проблеме с БД", async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error("DB error"));

      await expect(service.getSuggestions("блок", 7)).rejects.toBe(
        "Не удалось получить подсказки, DB error",
      );
    });
  });

  describe("updateOrCreate", () => {
    const updateDto: UpdateSearchDto = { text: "блокнот а5", result_count: 24 };

    it("должен увеличить views у существующего запроса", async () => {
      const existing = { ...mockSearch, views: 10 };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({ ...existing, views: 11, result_count: 24 });

      const result = await service.updateOrCreate(updateDto);

      expect(result).toBeDefined();
      expect(result!.views).toBe(11);
      expect(result!.result_count).toBe(24);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ views: 11, result_count: 24 }),
      );
    });

    it("должен создать новый запрос если его нет в БД", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSearch);
      mockRepository.save.mockResolvedValue(mockSearch);

      const result = await service.updateOrCreate(updateDto);

      expect(result).toEqual(mockSearch);
      expect(mockRepository.create).toHaveBeenCalledWith({
        text: "блокнот а5",
        result_count: 24,
        views: 1,
      });
    });

    it("должен вернуть null для мусорного запроса", async () => {
      const garbageDto: UpdateSearchDto = { text: "ааааа", result_count: 0 };

      const result = await service.updateOrCreate(garbageDto);

      expect(result).toBeNull();
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it("должен вернуть null для запроса короче 3 символов", async () => {
      const shortDto: UpdateSearchDto = { text: "ab", result_count: 0 };

      const result = await service.updateOrCreate(shortDto);

      expect(result).toBeNull();
    });

    it("должен вернуть null для URL", async () => {
      const urlDto: UpdateSearchDto = { text: "https://example.com", result_count: 0 };

      const result = await service.updateOrCreate(urlDto);

      expect(result).toBeNull();
    });

    it("должен вернуть null для HTML", async () => {
      const htmlDto: UpdateSearchDto = { text: "<script>", result_count: 0 };

      const result = await service.updateOrCreate(htmlDto);

      expect(result).toBeNull();
    });
  });

  describe("getPopular", () => {
    it("должен вернуть популярные запросы", async () => {
      const popular = [mockSearch];
      mockQueryBuilder.getMany.mockResolvedValue(popular);

      const result = await service.getPopular(5);

      expect(result).toEqual(popular);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("search.result_count > 0");
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it("должен выбросить ошибку при проблеме с БД", async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error("DB error"));

      await expect(service.getPopular(5)).rejects.toBe(
        "Не удалось получить популярные запросы, DB error",
      );
    });
  });

  describe("findAll", () => {
    it("должен вернуть запросы с пагинацией", async () => {
      const queries = [mockSearch];
      mockRepository.find.mockResolvedValue(queries);

      const result = await service.findAll("1", "10");

      expect(result).toEqual(queries);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { id: "DESC" },
      });
    });

    it("должен фильтровать по тексту", async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.findAll("1", "10", "блокнот");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { text: expect.anything() },
        }),
      );
    });

    it("должен выбросить ошибку при проблеме с БД", async () => {
      mockRepository.find.mockRejectedValue(new Error("DB error"));

      await expect(service.findAll("1", "10")).rejects.toBe(
        "Не удалось получить список запросов, DB error",
      );
    });
  });

  describe("getTotalCount", () => {
    it("должен вернуть общее количество", async () => {
      mockRepository.count.mockResolvedValue(42);

      const result = await service.getTotalCount();

      expect(result).toBe(42);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: {} });
    });

    it("должен учитывать фильтр по тексту", async () => {
      mockRepository.count.mockResolvedValue(5);

      await service.getTotalCount("блокнот");

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { text: expect.anything() },
        }),
      );
    });
  });

  describe("remove", () => {
    it("должен удалить запрос по id", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it("должен выбросить ошибку при проблеме с БД", async () => {
      mockRepository.delete.mockRejectedValue(new Error("DB error"));

      await expect(service.remove(999)).rejects.toBe(
        "Не удалось удалить запрос, DB error",
      );
    });
  });

});
