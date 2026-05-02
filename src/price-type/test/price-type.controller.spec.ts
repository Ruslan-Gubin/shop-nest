import { Test, TestingModule } from "@nestjs/testing";
import { PriceTypeController } from "../price-type.controller";
import { PriceTypeService } from "../price-type.service";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { PriceType } from "../entities/price-type.entity";

describe("PriceTypeController", () => {
  let controller: PriceTypeController;
  let service: jest.Mocked<PriceTypeService>;

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

  const mockUser = {
    sub: 1,
    email: "admin@test.com",
    role: "admin",
    password: "",
    name: "Admin",
    iat: 1234567890,
    exp: 1234567890,
    refresh: "refresh_token",
  };

  const mockPriceTypeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getTotalCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceTypeController],
      providers: [
        {
          provide: PriceTypeService,
          useValue: mockPriceTypeService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PriceTypeController>(PriceTypeController);
    service = module.get<PriceTypeService>(PriceTypeService) as jest.Mocked<PriceTypeService>;

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("должен создать тип цены", async () => {
      const createDto = {
        name: "Оптовый",
        description: "Оптовая цена",
        isPublic: true,
        minQuantity: 10,
        created_user_id: 1,
      };

      mockPriceTypeService.create.mockResolvedValue(mockPriceType);

      const result = await controller.create(createDto, mockUser);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Тип цены успешно добавлен");
      expect(result.data).toEqual(mockPriceType);
      expect(mockPriceTypeService.create).toHaveBeenCalledWith({
        ...createDto,
        created_user_id: mockUser.sub,
      });
    });

    it("должен вернуть ошибку при создании", async () => {
      const createDto = {
        name: "Оптовый",
        description: "Оптовая цена",
        isPublic: true,
        minQuantity: 10,
        created_user_id: 1,
      };

      mockPriceTypeService.create.mockRejectedValue(new Error("DB error"));

      const result = await controller.create(createDto, mockUser);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAll", () => {
    it("должен вернуть список типов цен", async () => {
      mockPriceTypeService.findAll.mockResolvedValue([mockPriceType]);
      mockPriceTypeService.getTotalCount.mockResolvedValue(1);

      const result = await controller.findAll("1", "10", "");

      expect(result.status).toBe("success");
      expect(result.data).toEqual({
        priceTypes: [mockPriceType],
        totalCount: 1,
        paginationPage: "1",
      });
      expect(result.message).toBe("Список типов цен получен");
    });

    it("должен фильтровать по name", async () => {
      mockPriceTypeService.findAll.mockResolvedValue([mockPriceType]);
      mockPriceTypeService.getTotalCount.mockResolvedValue(1);

      await controller.findAll("1", "10", "Опт");

      expect(mockPriceTypeService.findAll).toHaveBeenCalledWith("1", "10", "Опт");
      expect(mockPriceTypeService.getTotalCount).toHaveBeenCalledWith("Опт");
    });

    it("должен вернуть ошибку при получении списка", async () => {
      mockPriceTypeService.findAll.mockRejectedValue(new Error("DB error"));

      const result = await controller.findAll("1", "10", "");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAllMy", () => {
    it("должен вернуть типы цен текущего пользователя", async () => {
      mockPriceTypeService.findAll.mockResolvedValue([mockPriceType]);
      mockPriceTypeService.getTotalCount.mockResolvedValue(1);

      const result = await controller.findAllMy(mockUser, "1", "10", "");

      expect(result.status).toBe("success");
      expect(result.data).toEqual({
        priceTypes: [mockPriceType],
        totalCount: 1,
        paginationPage: "1",
      });
      expect(mockPriceTypeService.findAll).toHaveBeenCalledWith("1", "10", "", mockUser.sub);
    });
  });

  describe("findOne", () => {
    it("должен вернуть тип цены по id", async () => {
      mockPriceTypeService.findOne.mockResolvedValue(mockPriceType);

      const result = await controller.findOne("1");

      expect(result.status).toBe("success");
      expect(result.data).toEqual(mockPriceType);
      expect(result.message).toBe("Тип цены получен");
      expect(mockPriceTypeService.findOne).toHaveBeenCalledWith(1);
    });

    it("должен вернуть null если тип цены не найден", async () => {
      mockPriceTypeService.findOne.mockResolvedValue(null);

      const result = await controller.findOne("999");

      expect(result.status).toBe("success");
      expect(result.data).toBeNull();
    });

    it("должен вернуть ошибку при поиске", async () => {
      mockPriceTypeService.findOne.mockRejectedValue(new Error("DB error"));

      const result = await controller.findOne("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("update", () => {
    it("должен обновить тип цены", async () => {
      const updateDto = {
        name: "Розничный",
        description: "Розничная цена",
        isPublic: true,
        minQuantity: 5,
        created_user_id: 1,
      };

      mockPriceTypeService.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Тип цены успешно обновлён");
      expect(mockPriceTypeService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it("должен вернуть ошибку при обновлении", async () => {
      const updateDto = {
        name: "Розничный",
        description: "Розничная цена",
        isPublic: true,
        minQuantity: 5,
        created_user_id: 1,
      };

      mockPriceTypeService.update.mockRejectedValue(new Error("DB error"));

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("remove", () => {
    it("должен удалить тип цены", async () => {
      mockPriceTypeService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove("1");

      expect(result.status).toBe("success");
      expect(result.message).toBe("Тип цены успешно удалён");
      expect(mockPriceTypeService.remove).toHaveBeenCalledWith(1);
    });

    it("должен вернуть ошибку при удалении", async () => {
      mockPriceTypeService.remove.mockRejectedValue(new Error("DB error"));

      const result = await controller.remove("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });
});