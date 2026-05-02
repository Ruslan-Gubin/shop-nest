import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, Like, type Repository } from "typeorm";
import { CreateCartDiscountDto } from "./dto/create-cart-discount.dto";
import { UpdateCartDiscountDto } from "./dto/update-cart-discount.dto";
import { CartDiscount } from "./entities/cart-discount.entity";

@Injectable()
export class CartDiscountsService {
  constructor(
    @InjectRepository(CartDiscount)
    private cartDiscountRepository: Repository<CartDiscount>,
  ) {}

  async create(createCartDiscountDto: CreateCartDiscountDto) {
    return this.cartDiscountRepository.save(createCartDiscountDto).catch((error) => {
      throw `Не удалось добавить скидку на корзину, ${error.message}`;
    });
  }

  async findAll(page: string, limit: string, name: string, created_user_id?: number) {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.cartDiscountRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список скидок на корзину, ${error.message}`;
      });
  }

  async getTotalCount(name?: string, created_user_id?: number) {
    const whereCondition: { name?: FindOperator<string>; created_user_id?: number } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    if (created_user_id) {
      whereCondition.created_user_id = created_user_id;
    }

    return this.cartDiscountRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество скидок на корзину, ${error.message}`;
    });
  }

  async findOne(id: number) {
    return this.cartDiscountRepository.findOne({ where: { id } }).catch((error) => {
      throw `Не удалось получить скидку на корзину, ${error.message}`;
    });
  }

  async findActive() {
    return this.cartDiscountRepository.find({ where: { is_active: true } }).catch((error) => {
      throw `Не удалось получить активные скидки на корзину, ${error.message}`;
    });
  }

  async update(id: number, updateCartDiscountDto: UpdateCartDiscountDto) {
    return this.cartDiscountRepository
      .update(id, {
        ...updateCartDiscountDto,
      })
      .catch((error) => {
        throw `Не удалось изменить скидку на корзину, ${error.message}`;
      });
  }

  async remove(id: number) {
    await this.cartDiscountRepository.delete(id).catch((error) => {
      throw `Не удалось удалить скидку на корзину, ${error.message}`;
    });
  }
}