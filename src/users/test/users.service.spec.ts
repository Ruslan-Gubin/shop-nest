import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersService } from "../users.service";
import { User } from "../entities/user.entity";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user-dto";
import * as argon from "argon2";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword123"),
  verify: jest.fn(),
}));

describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 1,
    name: "Иван Петров",
    phone: "+79991234567",
    email: "ivan@example.com",
    refresh: "refresh_token_hash",
    password: "hashedPassword123",
    department_id: 1,
    role: "user",
    photo: "avatar.jpg",
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
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<jest.Mocked<Repository<User>>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreateUserDto = {
      name: "Иван Петров",
      email: "ivan@example.com",
      password: "password123",
      phone: "+79991234567",
      role: "user",
      refresh: "",
    };

    it("должен создать пользователя с хешированным паролем", async () => {
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(argon.hash).toHaveBeenCalledWith("password123");
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "hashedPassword123",
        }),
      );
    });
  });

  describe("getAllUsers", () => {
    it("должен вернуть всех пользователей с пагинацией", async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getAllUsers("1", "10", "");

      expect(result).toEqual([mockUser]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { name: "" },
        order: { id: "DESC" },
      });
    });

    it("должен корректно вычислять skip", async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      await service.getAllUsers("3", "20", "");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it("должен передавать name параметр в where", async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      await service.getAllUsers("1", "10", "Иван");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: "Иван" }),
        }),
      );
    });
  });

  describe("getTotalCount", () => {
    it("должен вернуть общее количество пользователей", async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.getTotalCount();

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith();
    });
  });

  describe("findById", () => {
    it("должен вернуть пользователя по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если пользователь не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("должен вернуть пользователя по email", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail("ivan@example.com");

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: "ivan@example.com" } });
    });

    it("должен вернуть null если пользователь не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail("unknown@example.com");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const updateDto: UpdateUserDto = {
      name: "Петр Иванов",
      phone: "+79997654321",
      email: "ivan@example.com",
      password: "",
      role: "user",
    };

    it("должен обновить пользователя", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });

it("должен хешировать пароль при обновлении", async () => {
      const updateDtoWithPassword: UpdateUserDto = {
        name: "",
        phone: "",
        email: "",
        password: "newPassword123",
        role: "",
      };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDtoWithPassword);

      expect(argon.hash).toHaveBeenCalledWith("newPassword123");
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        name: "",
        phone: "",
        email: "",
        password: "hashedPassword123",
        role: "",
      });
    });
  });

  describe("delete", () => {
    it("должен удалить пользователя", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("updateRefresh", () => {
    it("должен обновить refresh токен", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateRefresh(1, "new_refresh_token");

      expect(mockRepository.update).toHaveBeenCalledWith(1, { refresh: "new_refresh_token" });
    });
  });
});