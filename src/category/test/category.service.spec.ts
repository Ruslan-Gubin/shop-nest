import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CategoryService } from "../category.service";
import { Category } from "../entities/category.entity";
import { CreateCategoryDto } from "../dto/create-category.dto";
import { UpdateCategoryDto } from "../dto/update-category.dto";
import { UpdatePositionCategoryDto } from "../dto/update-position-category-dto";

describe("CategoryService", () => {
  let service: CategoryService;
  let repository: jest.Mocked<Repository<Category>>;

  const mockCategory: Category = {
    id: 1,
    parent_id: null,
    position: 1,
    moderated: true,
    is_active: true,
    created_user_id: 1,
    createdBy: null as never,
    name: "Электроника",
    description: "Категория электроники",
    image: "electronics.jpg",
    product_count: 10,
    created_at: new Date("2024-01-01"),
    updated_at: null,
  };

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get<jest.Mocked<Repository<Category>>>(getRepositoryToken(Category));

    // clearAllMocks сбрасывает только вызовы, но не реализации:
    // mockRejectedValue из одного теста протекал в последующие.
    jest.resetAllMocks();
  });

  describe("create", () => {
    const createDto: CreateCategoryDto = {
      name: "Электроника",
      description: "Категория электроники",
      image: "electronics.jpg",
      parent_id: null as unknown as number,
      position: 1,
      created_user_id: 1,
    };

    it("должен создать категорию", async () => {
      mockRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("должен вернуть все категории", async () => {
      mockRepository.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockCategory]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { position: "ASC", created_at: "ASC" },
      });
    });
  });

  describe("findCategoriesWithProducts", () => {
    it("должен оставить только категории, в которых есть товары", async () => {
      const parentCategory: Category = {
        ...mockCategory,
        id: 1,
        parent_id: null,
        position: 1,
      };
      const childWithProducts: Category = {
        ...mockCategory,
        id: 2,
        parent_id: 1,
        position: 1,
      };
      mockRepository.query.mockResolvedValue([parentCategory, childWithProducts]);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.findCategoriesWithProducts("user");

      // findAllAvailableCategories возвращает плоский список, а sortedCategories
      // собирает из него дерево: дочерняя категория уходит в children родителя.
      expect(result).toHaveLength(1);
      expect(result).toMatchObject([{ id: 1, children: [{ id: 2 }] }]);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("должен вернуть пустой список, если товаров нет ни в одной категории", async () => {
      mockRepository.query.mockResolvedValue([]);

      const result = await service.findCategoriesWithProducts("user");

      expect(result).toEqual([]);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("должен выбросить ошибку при неудачном запросе категорий с товарами", async () => {
      mockRepository.query.mockRejectedValue(new Error("db error"));

      // Ошибка приходит из findAllAvailableCategories, который вызывается первым.
      await expect(service.findCategoriesWithProducts("user")).rejects.toContain(
        "Не удалось получить все доступные категории",
      );
    });
  });

  describe("sortedCategories", () => {
    it("должен возвращать категории отсортированные по позиции", async () => {
      const categories: Category[] = [
        { ...mockCategory, id: 1, position: 2, name: "Category 2" },
        { ...mockCategory, id: 2, position: 1, name: "Category 1" },
      ];

      mockRepository.find.mockResolvedValue(categories);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.sortedCategories(categories);

      expect(result.length).toBe(2);
    });

    it("должен строить дерево категорий с детьми", async () => {
      const parentCategory: Category = {
        ...mockCategory,
        id: 1,
        parent_id: null,
        position: 1,
        product_count: 5,
      };
      const childCategory: Category = {
        ...mockCategory,
        id: 2,
        parent_id: 1,
        position: 1,
        product_count: 3,
      };
      const categories = [parentCategory, childCategory];

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.sortedCategories(categories);

      expect(result).toBeDefined();
    });
  });

  describe("updateCategoriesGroupPosition", () => {
    it("не должен обновлять позиции если категории уже в правильном порядке", async () => {
      const categories: Category[] = [
        { ...mockCategory, id: 1, position: 1, product_count: 5 },
        { ...mockCategory, id: 2, position: 2, product_count: 3 },
      ];

      const result = await service.updateCategoriesGroupPosition(categories);

      expect(result).toEqual(categories);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("changePosition", () => {
    it("должен изменить позицию категории", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.changePosition(1, 5);

      expect(mockRepository.update).toHaveBeenCalledWith(1, { position: 5 });
    });
  });

  describe("update", () => {
    const updateDto: UpdateCategoryDto = {
      name: "Обновленная категория",
      description: "Новое описание",
    };

    it("должен обновить категорию", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(1, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("updatePosition", () => {
    const updatePositionDto: UpdatePositionCategoryDto = {
      parent_id: 1,
      position: 2,
    };

    it("должен обновить позицию категории", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updatePosition(1, updatePositionDto);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updatePositionDto);
    });
  });

  describe("delete", () => {
    it("должен удалить категорию", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("changeChildrenParentId", () => {
    it("должен менять parent_id у дочерних категорий", async () => {
      // changeChildrenParentId читает детей через query (getChildren), а не через find.
      mockRepository.query
        .mockResolvedValueOnce([{ ...mockCategory, id: 2, parent_id: 1 }])
        .mockResolvedValueOnce([]);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.changeChildrenParentId(1, 2);

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it("не должен делать ничего если нет дочерних категорий", async () => {
      mockRepository.query.mockResolvedValue([]);

      await service.changeChildrenParentId(1, 2);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("getChildren", () => {
    it("должен вернуть дочерние категории", async () => {
      const children = [{ ...mockCategory, parent_id: 1 }];
      mockRepository.query.mockResolvedValue(children);

      const result = await service.getChildren(1, "admin");

      expect(result).toEqual(children);
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("c.parent_id = $1"),
        [1],
      );
    });

    it("должен вернуть корневые категории при parent_id = null", async () => {
      const roots = [{ ...mockCategory, parent_id: null }];
      mockRepository.query.mockResolvedValue(roots);

      const result = await service.getChildren(null, "admin");

      expect(result).toEqual(roots);
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("c.parent_id IS NULL"),
        [],
      );
    });
  });

  describe("changeParent", () => {
    it("должен изменить родителя категории", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.changeParent(1, 2);

      expect(mockRepository.update).toHaveBeenCalledWith(1, { parent_id: 2 });
    });

    it("должен позволить сделать категорию корневой", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.changeParent(1, null);

      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        parent_id: null,
      });
    });
  });
});
