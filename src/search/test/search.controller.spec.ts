import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "../search.controller";
import { SearchService } from "../search.service";
import { Search } from "../entities/search.entity";

describe("SearchController", () => {
  let controller: SearchController;
  let service: jest.Mocked<SearchService>;

  const mockSearch: Search = {
    id: 1,
    text: "блокнот а5",
    result_count: 24,
    views: 10,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-05-01"),
  };

  const mockService = {
    getSuggestions: jest.fn(),
    updateOrCreate: jest.fn(),
    getPopular: jest.fn(),
    findAll: jest.fn(),
    getTotalCount: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService) as jest.Mocked<SearchService>;

    jest.clearAllMocks();
  });

  describe("suggest (GET /search)", () => {
    it("должен вернуть подсказки", async () => {
      const suggestions = [mockSearch];
      mockService.getSuggestions.mockResolvedValue(suggestions);

      const result = await controller.suggest("блок", 7);

      expect(result.status).toBe("success");
      expect(result.data).toEqual(suggestions);
      expect(mockService.getSuggestions).toHaveBeenCalledWith("блок", 7);
    });

    it("должен использовать лимит по умолчанию 7", async () => {
      mockService.getSuggestions.mockResolvedValue([]);

      await controller.suggest("блок", undefined);

      expect(mockService.getSuggestions).toHaveBeenCalledWith("блок", 7);
    });

    it("должен ограничить лимит максимумом 10", async () => {
      mockService.getSuggestions.mockResolvedValue([]);

      await controller.suggest("блок", 100);

      expect(mockService.getSuggestions).toHaveBeenCalledWith("блок", 10);
    });

    it("должен вернуть ошибку", async () => {
      mockService.getSuggestions.mockRejectedValue(new Error("DB error"));

      const result = await controller.suggest("блок", 7);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("update (POST /search/update)", () => {
    it("должен обновить запрос", async () => {
      const updateDto = { text: "блокнот а5", result_count: 24 };
      mockService.updateOrCreate.mockResolvedValue(mockSearch);

      const result = await controller.update(updateDto);

      expect(result.status).toBe("success");
      expect(result.data).toEqual(mockSearch);
      expect(mockService.updateOrCreate).toHaveBeenCalledWith(updateDto);
    });

    it("должен вернуть success при мусорном запросе (null от сервиса)", async () => {
      const updateDto = { text: "ааааа", result_count: 0 };
      mockService.updateOrCreate.mockResolvedValue(null);

      const result = await controller.update(updateDto);

      expect(result.status).toBe("success");
      expect(result.data).toBeNull();
    });

    it("должен вернуть ошибку", async () => {
      const updateDto = { text: "блокнот а5", result_count: 24 };
      mockService.updateOrCreate.mockRejectedValue(new Error("DB error"));

      const result = await controller.update(updateDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAll (GET /search/all)", () => {
    it("должен вернуть запросы с пагинацией", async () => {
      const queries = [mockSearch];
      mockService.findAll.mockResolvedValue(queries);
      mockService.getTotalCount.mockResolvedValue(1);

      const result = await controller.findAll("1", "10", "блок");

      expect(result.status).toBe("success");
      expect(result.data).toEqual({
        queries,
        totalCount: 1,
        paginationPage: "1",
      });
      expect(mockService.findAll).toHaveBeenCalledWith("1", "10", "блок");
      expect(mockService.getTotalCount).toHaveBeenCalledWith("блок");
    });

    it("должен работать без фильтра по тексту", async () => {
      mockService.findAll.mockResolvedValue([]);
      mockService.getTotalCount.mockResolvedValue(0);

      const result = await controller.findAll("1", "10", undefined);

      expect(result.status).toBe("success");
      expect(mockService.findAll).toHaveBeenCalledWith("1", "10", undefined);
      expect(mockService.getTotalCount).toHaveBeenCalledWith(undefined);
    });

    it("должен вернуть ошибку", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));

      const result = await controller.findAll("1", "10", "");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("remove (DELETE /search/:id)", () => {
    it("должен удалить запрос", async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove("1");

      expect(result.status).toBe("success");
      expect(result.message).toBe("Запрос успешно удалён");
      expect(mockService.remove).toHaveBeenCalledWith(1);
    });

    it("должен вернуть ошибку", async () => {
      mockService.remove.mockRejectedValue(new Error("DB error"));

      const result = await controller.remove("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("popular (GET /search/popular)", () => {
    it("должен вернуть популярные запросы", async () => {
      const popular = [mockSearch];
      mockService.getPopular.mockResolvedValue(popular);

      const result = await controller.popular(5);

      expect(result.status).toBe("success");
      expect(result.data).toEqual(popular);
      expect(mockService.getPopular).toHaveBeenCalledWith(5);
    });

    it("должен использовать лимит по умолчанию 5", async () => {
      mockService.getPopular.mockResolvedValue([]);

      await controller.popular(undefined);

      expect(mockService.getPopular).toHaveBeenCalledWith(5);
    });

    it("должен ограничить лимит максимумом 20", async () => {
      mockService.getPopular.mockResolvedValue([]);

      await controller.popular(100);

      expect(mockService.getPopular).toHaveBeenCalledWith(20);
    });

    it("должен вернуть ошибку", async () => {
      mockService.getPopular.mockRejectedValue(new Error("DB error"));

      const result = await controller.popular(5);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });
});
