import { Controller, Get, Post, Body, Query, Param, Delete, UseGuards } from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { SearchService } from "./search.service";
import { ResponseData, responseData } from "src/helpers/response";
import { Search } from "./entities/search.entity";
import { UpdateSearchDto } from "./dto/update-search.dto";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async suggest(
    @Query("text") text: string,
    @Query("limit") limit?: number,
  ): Promise<ResponseData<Search[] | null>> {
    try {
      const suggestions = await this.searchService.getSuggestions(text, limit || 0);

      return responseData(suggestions, "success", [], "");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Public()
  @Get("popular")
  async popular(@Query("limit") limit?: number): Promise<ResponseData<Search[] | null>> {
    try {
      const popular = await this.searchService.getPopular(limit || 0);

      return responseData(popular, "success", [], "Список популярных запросов получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("all")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("text") text?: string,
  ): Promise<
    ResponseData<{
      queries: Search[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const queries = await this.searchService.findAll(page, limit, text);
      const totalCount = await this.searchService.getTotalCount(text);

      return responseData(
        { queries, totalCount, paginationPage: page },
        "success",
        [],
        "Список запросов получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.searchService.remove(Number(id));

      return responseData(null, "success", [], "Запрос успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
