import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdatePositionCategoryDto } from "./dto/update-position-category-dto";
import { Category } from "./entities/category.entity";

type CategoryWithChildren = Omit<Category, "children"> & { children: Category[] };

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.categoryRepository.save(createCategoryDto).catch((error) => {
      throw `Не удалось добавить категорию, ${error.message}`;
    });
  }

  async findAll() {
    return this.categoryRepository
      .find({
        order: { position: "ASC", created_at: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить список категорий, ${error.message}`;
      });
  }

  public async sortedCategories(categories: Category[]): Promise<Category[]> {
    const map = new Map<number, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
      const node = map.get(cat.id);
      if (!node) {
        continue;
      }
      if (cat.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(cat.parent_id);

        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    for (const category of map.values()) {
      if (category.children.length > 0) {
        await this.updateCategoriesGroupPosition(category.children);
      }
    }

    return await this.updateCategoriesGroupPosition(roots);
  }

  async updateCategoriesGroupPosition(childrenList: Category[]) {
    childrenList.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      } else {
        const aUpdate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bUpdate = b.updated_at ? new Date(b.updated_at).getTime() : 0;

        if (aUpdate || bUpdate) {
          return bUpdate - aUpdate;
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      }
    });

    const isNeedChange = this.checkIsNeedUpdatePosition(childrenList);
    if (isNeedChange) {
      for (let i = 0; i < childrenList.length; i++) {
        const category = childrenList[i];
        const position = i + 1;

        category.position = position;
        await this.changePosition(category.id, position);
      }
    }
    return childrenList;
  }

  async changePosition(id: number, position: number) {
    return this.categoryRepository
      .update(id, {
        position,
      })
      .catch((error) => {
        throw `Не удалось изменить позицию, ${error.message}`;
      });
  }

  private checkIsNeedUpdatePosition(categories: Category[]) {
    let need = false;

    for (let i = 0; i < categories.length; i++) {
      if (categories[i].position !== i + 1) {
        need = true;
        break;
      }
    }

    return need;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.categoryRepository
      .update(id, {
        ...updateCategoryDto,
      })
      .catch((error) => {
        throw `Не удалось изменить категорию, ${error.message}`;
      });
  }

  async updatePosition(id: number, updatePositionCategoryDto: UpdatePositionCategoryDto) {
    return this.categoryRepository
      .update(id, {
        ...updatePositionCategoryDto,
      })
      .catch((error) => {
        throw `Не удалось изменить позицию категории, ${error.message}`;
      });
  }

  async delete(id: number) {
    await this.categoryRepository.delete(id).catch((error) => {
      throw `Не удалось удалить категорию, ${error.message}`;
    });
  }

  async changeChildrenParentId(parent_id: number | null, new_parent_id: number | null) {
    const categoriesNeedUpdate = await this.getChildren(parent_id);
    if (categoriesNeedUpdate.length === 0) return;

    const newParentCategories = await this.getChildren(new_parent_id);
    const parentLength = newParentCategories.length;

    for (let i = 0; i < categoriesNeedUpdate.length; i++) {
      const category = categoriesNeedUpdate[i];
      const position = parentLength + 1;

      await this.changeParent(category.id, new_parent_id);
      await this.changePosition(category.id, position);
    }
  }

  async getChildren(parent_id: number | null) {
    const query = this.categoryRepository.createQueryBuilder("category");

    query.where(
      parent_id === null ? "category.parent_id IS NULL" : "category.parent_id = :parent_id",
      { parent_id },
    );
    return await query.getMany().catch((error) => {
      throw `Не удалось получить список подкатегорий, ${error.message}`;
    });
  }

  async changeParent(id: number, parent_id: number | null) {
    return this.categoryRepository
      .update(id, {
        parent_id,
      })
      .catch((error) => {
        throw `Не удалось изменить категорию, ${error.message}`;
      });
  }
}
