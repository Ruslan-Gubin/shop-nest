import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";
import { UpdatePositionCategoryDto } from "./dto/update-position-category-dto";

@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post("create")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Category | null>> {
    try {
      const category = await this.categoryService.create({
        ...createCategoryDto,
        created_user_id: user.sub,
      });

      return responseData(category, "success", [], "Категория успешно добавлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: CreateCategoryDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.categoryService.update(Number(id), updateCategoryDto);

      return responseData(null, "success", [], "Категория успешно обновлена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("sort/:id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async updatePosition(
    @Param("id") id: string,
    @Body() updatePositionCategoryDto: UpdatePositionCategoryDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.categoryService.updatePosition(Number(id), updatePositionCategoryDto);

      return responseData(null, "success", [], "Изменения успешно сохранены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("categories")
  async findAll(): Promise<ResponseData<Category[] | null>> {
    try {
      const categories = await this.categoryService.findAll();
      const updateCategories = await this.categoryService.sortedCategories(categories);

      return responseData(updateCategories, "success", [], "Список категорий получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("fullPathCategories/:id")
  async getFullPathFromCategory(
    @Param("id") id: string,
  ): Promise<ResponseData<{ categories: Category[]; childrenCategories: Category[] } | null>> {
    try {
      const categories = await this.categoryService.getFullPathFromCategory(
        !isNaN(Number(id)) ? Number(id) : null,
      );
      const childrenCategories = !isNaN(Number(id))
        ? await this.categoryService.getChildren(Number(id))
        : [];

      const allCategory = await this.categoryService.findAll();
      const transitionCategories = await this.categoryService.sortedCategories(allCategory);

      return responseData(
        { categories, childrenCategories, transitionCategories },
        "success",
        [],
        "Весь путь категорий от родительской к указанной получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id/:parent_id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(
    @Param("id") id: string,
    @Param("parent_id") parent_id: string,
  ): Promise<ResponseData<null>> {
    try {
      const new_parent_id = !isNaN(Number(parent_id)) ? Number(parent_id) : null;
      await this.categoryService.delete(Number(id));
      await this.categoryService.changeChildrenParentId(Number(id), new_parent_id);

      return responseData(null, "success", [], "Категория успешно удалена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
