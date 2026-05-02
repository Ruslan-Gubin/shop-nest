import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "../auth.service";
import { UsersService } from "../../users/users.service";
import { User } from "../../users/entities/user.entity";
import { SignInDto } from "../dto/sign-in.dto";
import { CreateUserDto } from "../../users/dto/create-user.dto";
import * as argon from "argon2";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword123"),
  verify: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 1,
    name: "Иван Петров",
    phone: "+79991234567",
    email: "ivan@example.com",
    refresh: "hashed_refresh_token",
    password: "hashedPassword123",
    department_id: 1,
    role: "user",
    photo: "avatar.jpg",
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateRefresh: jest.fn(),
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = "jwt_secret";
    process.env.REFRESH_TOKEN_SECRET = "refresh_secret";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    const createUserDto: CreateUserDto = {
      name: "Иван Петров",
      email: "ivan@example.com",
      password: "password123",
      phone: "+79991234567",
      role: "user",
      refresh: "",
    };

    it("должен создать пользователя и вернуть токены", async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce("access_token")
        .mockResolvedValueOnce("refresh_token");
      mockUsersService.updateRefresh.mockResolvedValue({ affected: 1 } as any);

      const result = await service.signUp(createUserDto);

      expect(result).toEqual({
        token: "access_token",
        refresh: "refresh_token",
      });
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe("signIn", () => {
    const signInDto: SignInDto = {
      email: "ivan@example.com",
      password: "password123",
    };

    it("должен вернуть токены при успешном входе", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce("access_token")
        .mockResolvedValueOnce("refresh_token");
      mockUsersService.updateRefresh.mockResolvedValue({ affected: 1 } as any);

      const result = await service.signIn(signInDto);

      expect(result).toEqual({
        token: "access_token",
        refresh: "refresh_token",
      });
    });

    it("должен выбросить ошибку при неверном пароле", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toBe(
        "Неверный адрес электронной почты или пароль",
      );
    });

    it("должен вернуть null если пользователь не найден", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.signIn(signInDto);

      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("должен очистить refresh токен", async () => {
      mockUsersService.updateRefresh.mockResolvedValue({ affected: 1 } as any);

      await service.logout(1);

      expect(mockUsersService.updateRefresh).toHaveBeenCalledWith(1, "");
    });
  });

  describe("refreshToken", () => {
    it("должен вернуть новые токены при валидном refresh токене", async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce("new_access_token")
        .mockResolvedValueOnce("new_refresh_token");
      mockUsersService.updateRefresh.mockResolvedValue({ affected: 1 } as any);

      const result = await service.refreshToken(1, "valid_refresh_token");

      expect(result).toEqual({
        token: "new_access_token",
        refresh: "new_refresh_token",
      });
    });

    it("должен выбросить ошибку при невалидном refresh токене", async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshToken(1, "invalid_token")).rejects.toBe(
        "Токены не совпали",
      );
    });

    it("должен вернуть null если пользователь не найден", async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const result = await service.refreshToken(1, "some_token");

      expect(result).toBeNull();
    });
  });

  describe("generateTokens (private method)", () => {
    it("должен вызывать jwt.signAsync для генерации токенов", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce("access_token")
        .mockResolvedValueOnce("refresh_token");
      mockUsersService.updateRefresh.mockResolvedValue({ affected: 1 } as any);

      const result = await service.signIn({
        email: "ivan@example.com",
        password: "password123",
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result?.token).toBe("access_token");
      expect(result?.refresh).toBe("refresh_token");
    });
  });
});