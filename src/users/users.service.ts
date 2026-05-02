import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { DeleteResult, FindOperator, Repository } from "typeorm";
import { Like } from "typeorm";
import { User } from "./entities/user.entity";
import type { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import * as argon from "argon2";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hash(createUserDto.password ?? "");
    createUserDto.password = hashedPassword;

    return this.userRepository.save(createUserDto).catch((error) => {
      throw `Не удалось создать пользователей, ${error.message}`;
    });
  }

  async getAllUsers(page: string, limit: string, name: string): Promise<User[]> {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    return this.userRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список пользователей, ${error.message}`;
      });
  }

  async getTotalCount(name: string) {
    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    return this.userRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество пользователей, ${error.message}`;
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить пользователя по id, ${error.message}`;
      });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .findOne({
        where: { email },
      })
      .catch((error) => {
        throw `Не удалось получить пользователя, ${error.message}`;
      });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const hashedPassword = await this.hash(updateUserDto.password ?? "");
      updateUserDto.password = hashedPassword;
    }

    return this.userRepository
      .update(id, {
        ...updateUserDto,
      })
      .catch((error) => {
        throw `Не удалось изменить пользователя, ${error.message}`;
      });
  }

  private async hash(data: string) {
    return argon.hash(data);
  }

  async delete(id: number): Promise<DeleteResult> {
    return this.userRepository.delete(id).catch((error) => {
      throw `Не удалось удалить пользователя, ${error.message}`;
    });
  }

  async updateRefresh(id: number, refresh: string) {
    return this.userRepository.update(id, { refresh }).catch((error) => {
      throw `Не удалось обновить токен, ${error.message}`;
    });
  }
}
