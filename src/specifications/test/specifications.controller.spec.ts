import { Test, TestingModule } from "@nestjs/testing";
import { SpecificationsController } from "../specifications.controller";
import { SpecificationsService } from "../specifications.service";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Specification } from "../entities/specification.entity";

describe("SpecificationsController", () => {
  let controller: SpecificationsController;
  let service: jest.Mocked<SpecificationsService>;

  const mockSpecification: Specification = {
    id: 1,
    name: "Материал",
    type: "text",
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

  const mockSpecificationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getTotalCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecificationsController],
      providers: [
        {
          provide: SpecificationsService,
          useValue: mockSpecificationsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SpecificationsController>(SpecificationsController);
    service = module.get<SpecificationsService>(SpecificationsService) as jest.Mocked<SpecificationsService>;

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("должен создать характеристику", async () => {
      const createDto = {
        name: "Материал",
        type: "text" as const,
        created_user_id: 1,
      };

      mockSpecificationsService.create.mockResolvedValue(mockSpecification);

      const result = await controller.create(createDto, mockUser);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Характеристика успешно добавлена");
      expect(result.data).toEqual(mockSpecification);
      expect(mockSpecificationsService.create).toHaveBeenCalledWith({
        ...createDto,
        created_user_id: mockUser.sub,
      });
    });

    it("должен вернуть ошибку при создании", async () => {
      const createDto = {
        name: "Материал",
        type: "text" as const,
        created_user_id: 1,
      };

      mockSpecificationsService.create.mockRejectedValue(new Error("DB error"));

      const result = await controller.create(createDto, mockUser);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAll", () => {
    it("должен вернуть список характеристик", async () => {
      mockSpecificationsService.findAll.mockResolvedValue([mockSpecification]);
      mockSpecificationsService.getTotalCount.mockResolvedValue(1);

      const result = await controller.findAll("1", "10", "");

      expect(result.status).toBe("success");
      expect(result.data).toEqual({
        specifications: [mockSpecification],
        totalCount: 1,
        paginationPage: "1",
      });
      expect(result.message).toBe("Список характеристик получен");
    });

    it("должен фильтровать по name", async () => {
      mockSpecificationsService.findAll.mockResolvedValue([mockSpecification]);
      mockSpecificationsService.getTotalCount.mockResolvedValue(1);

      await controller.findAll("1", "10", "Мате");

      expect(mockSpecificationsService.findAll).toHaveBeenCalledWith("1", "10", "Мате");
      expect(mockSpecificationsService.getTotalCount).toHaveBeenCalledWith("Мате");
    });

    it("должен вернуть ошибку при получении списка", async () => {
      mockSpecificationsService.findAll.mockRejectedValue(new Error("DB error"));

      const result = await controller.findAll("1", "10", "");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("findAllMy", () => {
    it("должен вернуть характеристики текущего пользователя", async () => {
      mockSpecificationsService.findAll.mockResolvedValue([mockSpecification]);
      mockSpecificationsService.getTotalCount.mockResolvedValue(1);

      const result = await controller.findAllMy(mockUser, "1", "10", "");

      expect(result.status).toBe("success");
      expect(result.data).toEqual({
        specifications: [mockSpecification],
        totalCount: 1,
        paginationPage: "1",
      });
      expect(mockSpecificationsService.findAll).toHaveBeenCalledWith("1", "10", "", mockUser.sub);
    });
  });

  describe("findOne", () => {
    it("должен вернуть характеристику по id", async () => {
      mockSpecificationsService.findOne.mockResolvedValue(mockSpecification);

      const result = await controller.findOne("1");

      expect(result.status).toBe("success");
      expect(result.data).toEqual(mockSpecification);
      expect(result.message).toBe("Характеристика получена");
      expect(mockSpecificationsService.findOne).toHaveBeenCalledWith(1);
    });

    it("должен вернуть null если характеристика не найдена", async () => {
      mockSpecificationsService.findOne.mockResolvedValue(null);

      const result = await controller.findOne("999");

      expect(result.status).toBe("success");
      expect(result.data).toBeNull();
    });

    it("должен вернуть ошибку при поиске", async () => {
      mockSpecificationsService.findOne.mockRejectedValue(new Error("DB error"));

      const result = await controller.findOne("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("update", () => {
    it("должен обновить характеристику", async () => {
      const updateDto = {
        name: "Цвет",
        type: "color" as const,
        created_user_id: 1,
      };

      mockSpecificationsService.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("success");
      expect(result.message).toBe("Характеристика успешно обновлена");
      expect(mockSpecificationsService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it("должен вернуть ошибку при обновлении", async () => {
      const updateDto = {
        name: "Цвет",
        type: "color" as const,
        created_user_id: 1,
      };

      mockSpecificationsService.update.mockRejectedValue(new Error("DB error"));

      const result = await controller.update("1", updateDto);

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });

  describe("remove", () => {
    it("должен удалить характеристику", async () => {
      mockSpecificationsService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove("1");

      expect(result.status).toBe("success");
      expect(result.message).toBe("Характеристика успешно удалена");
      expect(mockSpecificationsService.remove).toHaveBeenCalledWith(1);
    });

    it("должен вернуть ошибку при удалении", async () => {
      mockSpecificationsService.remove.mockRejectedValue(new Error("DB error"));

      const result = await controller.remove("1");

      expect(result.status).toBe("error");
      expect(result.data).toBeNull();
    });
  });
});
