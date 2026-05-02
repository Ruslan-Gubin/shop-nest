import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CartDiscountsService } from "../cart-discounts.service";
import { CartDiscount } from "../entities/cart-discount.entity";
import { CreateCartDiscountDto } from "../dto/create-cart-discount.dto";
import { UpdateCartDiscountDto } from "../dto/update-cart-discount.dto";

describe("CartDiscountsService", () => {
  let service: CartDiscountsService;
  let repository: jest.Mocked<Repository<CartDiscount>>;

  const mockCartDiscount: CartDiscount = {
    id: 1,
    name: "Скидка при покупке от 5000",
    min_sum: 5000,
    percent: 10,
    apply_to: "cart",
    is_active: true,
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
        CartDiscountsService,
        {
          provide: getRepositoryToken(CartDiscount),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CartDiscountsService>(CartDiscountsService);
    repository = module.get<jest.Mocked<Repository<CartDiscount>>>(getRepositoryToken(CartDiscount));

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreateCartDiscountDto = {
      name: "Скидка при покупке от 5000",
      min_sum: 5000,
      percent: 10,
      apply_to: "cart",
      is_active: true,
      created_user_id: 1,
    };

    it("должен создать скидку на корзину", async () => {
      mockRepository.save.mockResolvedValue(mockCartDiscount);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCartDiscount);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("должен вернуть все скидки без фильтров", async () => {
      mockRepository.find.mockResolvedValue([mockCartDiscount]);

      const result = await service.findAll("1", "10", "");

      expect(result).toEqual([mockCartDiscount]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        order: { id: "DESC" },
      });
    });

    it("должен фильтровать по name", async () => {
      mockRepository.find.mockResolvedValue([mockCartDiscount]);

      await service.findAll("1", "10", "Скидка");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Скидка%" }),
          }),
        }),
      );
    });

    it("должен фильтровать по created_user_id", async () => {
      mockRepository.find.mockResolvedValue([mockCartDiscount]);

      await service.findAll("1", "10", "", 1);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ created_user_id: 1 }),
        }),
      );
    });

    it("должен корректно вычислять skip", async () => {
      mockRepository.find.mockResolvedValue([mockCartDiscount]);

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

      await service.getTotalCount("Скидка");

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ value: "%Скидка%" }),
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
    it("должен вернуть скидку по id", async () => {
      mockRepository.findOne.mockResolvedValue(mockCartDiscount);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCartDiscount);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("должен вернуть null если не найден", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("findActive", () => {
    it("должен вернуть активные скидки", async () => {
      mockRepository.find.mockResolvedValue([mockCartDiscount]);

      const result = await service.findActive();

      expect(result).toEqual([mockCartDiscount]);
      expect(mockRepository.find).toHaveBeenCalledWith({ where: { is_active: true } });
    });
  });

  describe("update", () => {
    const updateDto: UpdateCartDiscountDto = {
      name: "Обновленная скидка",
      percent: 15,
    };

    it("должен обновить скидку", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("remove", () => {
    it("должен удалить скидку", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});