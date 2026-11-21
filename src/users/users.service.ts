import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { DeleteResult, FindOperator, Repository } from "typeorm";
import { ILike } from "typeorm";
import { User } from "./entities/user.entity";
import type { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { UpdatePasswordDto } from "./dto/update-password.dto";
import { PhotoService } from "src/photo/photo.service";
import { Photo } from "src/photo/entities/photo.entity";
import { StorageService } from "src/storage/storage.service";
import * as argon from "argon2";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly photoService: PhotoService,
    private readonly storageService: StorageService,
  ) {}

  async create(payload: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hash(payload.password ?? "");
    payload.password = hashedPassword;

    const user = await this.userRepository.save(payload).catch((error) => {
      throw `Не удалось создать пользователей, ${error.message}`;
    });

    await this.attachPhoto(user);

    return user;
  }

  async getAllUsers(page: string, limit: string, name: string): Promise<User[]> {
    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    const users = await this.userRepository
      .find({
        skip,
        take: Number(limit),
        where: whereCondition,
        order: { id: "DESC" },
      })
      .catch((error) => {
        throw `Не удалось получить список пользователей, ${error.message}`;
      });
    await this.attachPhotos(users);
    return users;
  }

  async getTotalCount(name: string) {
    const whereCondition: { name?: FindOperator<string> } = {};

    if (name) {
      whereCondition.name = ILike(`%${name}%`);
    }

    return this.userRepository.count({ where: whereCondition }).catch((error) => {
      throw `Не удалось получить общее количество пользователей, ${error.message}`;
    });
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.userRepository
      .findOne({
        where: { id },
      })
      .catch((error) => {
        throw `Не удалось получить пользователя по id, ${error.message}`;
      });
    if (user) await this.attachPhoto(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository
      .findOne({
        where: { email },
      })
      .catch((error) => {
        throw `Не удалось получить пользователя, ${error.message}`;
      });
    if (user) await this.attachPhoto(user);
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { phone } }).catch((error) => {
      throw `Не удалось получить пользователя по телефону, ${error.message}`;
    });
    if (user) await this.attachPhoto(user);
    return user;
  }

  async createPhoneUser(phone: string): Promise<User> {
    const user = await this.userRepository
      .save({
        phone,
        email: null,
        password: "",
        role: "user",
        refresh: "",
      })
      .catch((error) => {
        throw `Не удалось создать пользователя по телефону, ${error.message}`;
      });
    await this.attachPhoto(user);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hash(updateUserDto.password);
    } else {
      delete updateUserDto.password;
    }

    return this.userRepository.update(id, updateUserDto).catch((error) => {
      throw `Не удалось изменить пользователя, ${error.message}`;
    });
  }

  async updateProfile(id: number, payload: UpdateProfileDto): Promise<void> {
    const currentUser = await this.findById(id);

    if (!currentUser) {
      throw "Пользователь не найден";
    }

    await this.userRepository
      .update(id, {
        name: payload.name,
        email: payload.email === "" ? null : payload.email,
      })
      .catch((error) => {
        throw `Не удалось изменить пользователя, ${error}`;
      });
  }

  async updatePassword(id: number, payload: UpdatePasswordDto): Promise<void> {
    const currentUser = await this.findById(id);

    if (!currentUser) {
      throw "Пользователь не найден";
    }

    const hashedPassword = await this.hash(payload.password);

    await this.userRepository
      .update(id, {
        password: hashedPassword,
      })
      .catch((error) => {
        throw `Не удалось изменить пароль, ${error}`;
      });
  }

  async upsertAvatar(user_id: number, file: Express.Multer.File): Promise<Photo> {
    const user = await this.userRepository.findOne({ where: { id: user_id } });
    if (!user) {
      throw "Пользователь не найден";
    }

    const existing = await this.getAvatarPhoto(user_id);
    const url = await this.storageService.saveImage(file, {
      folder: "avatars",
      width: 512,
      height: 512,
      fit: "cover",
      withoutEnlargement: false,
      quality: 82,
    });

    if (existing) {
      await this.storageService.deleteByUrl(existing.url);
      await this.photoService.update(existing.id, { url });

      return existing;
    }

    return await this.photoService.createAndSetPosition({
      url,
      parent_type: "user",
      parent_id: user_id,
      position: 1,
    });
  }

  async removeAvatar(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw "Пользователь не найден";
    }

    const existing = await this.getAvatarPhoto(userId);

    if (!existing) {
      return;
    }

    await this.photoService.remove(existing.id);
  }

  private async getAvatarPhoto(userId: number): Promise<Photo | null> {
    const photos = await this.photoService.findByParent("user", userId);
    return photos[0] ?? null;
  }

  private async attachPhoto(user: User): Promise<void> {
    user.photo = await this.getAvatarPhoto(user.id);
  }

  private async attachPhotos(users: User[]): Promise<void> {
    if (users.length === 0) return;
    const ids = users.map((u) => u.id);
    const photos = await this.photoService.findForParents("user", ids);
    const byParent = new Map<number, Photo>();
    for (const photo of photos) {
      if (!byParent.has(photo.parent_id)) {
        byParent.set(photo.parent_id, photo);
      }
    }
    for (const user of users) {
      user.photo = byParent.get(user.id) ?? null;
    }
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
