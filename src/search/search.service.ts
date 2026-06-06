import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository, type FindOperator, ILike } from "typeorm";
import { UpdateSearchDto } from "./dto/update-search.dto";
import { Search } from "./entities/search.entity";

const GARBAGE_PATTERNS: RegExp[] = [
  /^(.?)\1{4,}$/, // ааааа, ббббб, 55555
  /^[йцукенгшщзхъфывапролджэячсмитьбю]{10,}$/i, // бессмысленный набор букв с клавиатуры
  /^[a-z]{10,}$/i, // латинские буквы 10+ подряд
  /^[0-9]{5,}$/, // только цифры 5+ подряд
  /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3,}$/, // только спецсимволы 3+
  /(http|https|www\.)/i, // URL
  /[<>]/, // HTML-теги
];

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Search)
    private searchRepository: Repository<Search>,
  ) {}

  async getSuggestions(text: string, limit: number): Promise<Search[]> {
    return this.searchRepository
      .createQueryBuilder("search")
      .where("search.text ILIKE :text", { text: `${text}%` })
      .andWhere("search.text != :exactText", { exactText: text })
      .andWhere("search.result_count > 0")
      .orderBy("search.views", "DESC")
      .addOrderBy("search.updated_at", "DESC")
      .take(limit)
      .getMany()
      .catch((error) => {
        throw `Не удалось получить подсказки, ${error.message}`;
      });
  }

  async updateOrCreate(updateDto: UpdateSearchDto): Promise<string> {
    if (this.isGarbage(updateDto.text)) {
      throw "Не верный формат поискового запроса для записи";
    }

    const existing = await this.searchRepository.findOne({ where: { text: updateDto.text } });

    if (existing) {
      await this.searchRepository
        .update(existing.id, { views: existing.views + 1, result_count: updateDto.result_count })
        .catch((error) => {
          throw `Не удалось обновить поисковый запрос, ${error.message}`;
        });
    } else {
      await this.searchRepository.save({ ...updateDto, views: 1 }).catch((error) => {
        throw `Не удалось создать новый поисковый запрос, ${error.message}`;
      });
    }

    return "success";
  }

  private isGarbage(text: string): boolean {
    const normalized = text.trim().toLowerCase();

    if (normalized.length < 3) {
      return true;
    }

    return GARBAGE_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  async getPopular(limit: number): Promise<Search[]> {
    return this.searchRepository
      .createQueryBuilder("search")
      .where("search.result_count > 0")
      .orderBy("search.views", "DESC")
      .addOrderBy("search.updated_at", "DESC")
      .take(limit)
      .getMany()
      .catch((error) => {
        throw `Не удалось получить популярные поисковые запросы, ${error.message}`;
      });
  }

  async findAll(page: string, limit: string, text?: string): Promise<Search[]> {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { text?: FindOperator<string> } = {};

    if (text) {
      whereCondition.text = ILike(`%${text}%`);
    }

    return this.searchRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { views: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список поисковых запросов, ${error.message}`;
      });
  }

  async getTotalCount(text?: string): Promise<number> {
    const whereCondition: { text?: FindOperator<string> } = {};

    if (text) {
      whereCondition.text = ILike(`%${text}%`);
    }

    return this.searchRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество поисковых запросов, ${error.message}`;
    });
  }

  async remove(id: number): Promise<void> {
    await this.searchRepository.delete(id).catch((error) => {
      throw `Не удалось удалить поисковый запрос, ${error.message}`;
    });
  }
}
