import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
  Query,
  Patch,
  Body,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { User } from "src/users/entities/user.entity";
import { UsersService } from "./users.service";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { OptionalJwtAuthGuard } from "src/auth/guards/optional-jwt-auth.guard";
import { ResponseData, responseData } from "src/helpers/response";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { UpdateUserDto } from "./dto/update-user-dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { Photo } from "src/photo/entities/photo.entity";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("create")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async create(@Body() payload: CreateUserDto): Promise<ResponseData<User | null>> {
    if (typeof payload.email === "string" && payload.email.length > 0) {
      const userEmail = await this.usersService.findByEmail(payload.email);

      if (userEmail) {
        return responseData(
          null,
          "error",
          [{ key: "email", message: "Эта почта уже зарегистрирована" }],
          "Эта почта уже зарегистрирована",
        );
      }
    }

    const findUserByPhone = await this.usersService.findByPhone(payload.phone);

    if (findUserByPhone) {
      return responseData(
        null,
        "error",
        [{ key: "phone", message: "Номер телефона уже занят" }],
        "Номер телефона уже занят",
      );
    }

    try {
      const user = await this.usersService.create(payload);
      return responseData(user, "success", [], "Пользователь успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("/users")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async getAllUsers(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name: string,
  ): Promise<
    ResponseData<{
      users: Omit<User, "password" | "refresh">[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const users = await this.usersService.getAllUsers(page, limit, name);
      const publicUsers: Omit<User, "password" | "refresh">[] = users.map(
        ({ password, refresh, ...rest }) => rest,
      );
      const totalCount = await this.usersService.getTotalCount(name);

      return responseData(
        { users: publicUsers, totalCount, paginationPage: page },
        "success",
        [],
        "Список пользователей получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user?: CurrentStrategyUser): Promise<
    ResponseData<
      | (Pick<User, "id" | "name" | "phone" | "email" | "role"> & {
          photo: Photo | null;
          has_password: boolean;
        })
      | null
    >
  > {
    try {
      if (!user) {
        throw "Пользователь не найден";
      }

      const currentUser = await this.usersService.findById(user.sub);

      return responseData(
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              phone: currentUser.phone,
              email: currentUser.email,
              role: currentUser.role,
              photo: currentUser.photo ?? null,
              has_password: currentUser.password.length > 0,
            }
          : null,
        currentUser ? "success" : "error",
        [],
        currentUser ? "Пользователь получен" : "Не удалось получить пользователя",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("avatar")
  @UseInterceptors(FileInterceptor("file"))
  async upsertAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Photo | null>> {
    try {
      if (!file) {
        throw "Файл изображения не найден";
      }

      if (!file.mimetype?.startsWith("image/")) {
        throw "Доступно к загрузке  только изображение";
      }

      const photo = await this.usersService.upsertAvatar(user.sub, file);
      return responseData(photo, "success", [], "Аватар успешно сохранён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete("avatar")
  async removeAvatar(@CurrentUser() user: CurrentStrategyUser): Promise<ResponseData<null>> {
    try {
      await this.usersService.removeAvatar(user.sub);
      return responseData(null, "success", [], "Аватар успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Public()
  @Get(":id")
  async findOne(
    @Param("id") id: string,
  ): Promise<ResponseData<Omit<User, "password" | "refresh"> | null>> {
    try {
      const user = await this.usersService.findById(Number(id));

      if (!user) {
        throw "Пользователь не найден";
      }

      const { password, refresh, ...rest } = user;

      return responseData(rest, "success", [], "Пользователь получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("update-profile")
  async updateProfile(
    @Body() payload: UpdateProfileDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<null>> {
    try {
      if (payload.email) {
        const findUserByEmail = await this.usersService.findByEmail(payload.email);

        if (findUserByEmail && findUserByEmail.id !== user.sub) {
          return responseData(
            null,
            "error",
            [{ key: "email", message: "Эта почта уже зарегистрирована" }],
            "Эта почта уже зарегистрирована",
          );
        }
      }

      await this.usersService.updateProfile(user.sub, payload);

      return responseData(null, "success", [], "Пользователь успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch("update-password")
  async updatePassword(
    @Body() payload: UpdatePasswordDto,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<null>> {
    try {
      await this.usersService.updatePassword(user.sub, payload);

      return responseData(null, "success", [], "Пароль успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponseData<null>> {
    const findUserByEmail = await this.usersService.findByEmail(updateUserDto.email);
    const findUserByPhone = await this.usersService.findByPhone(updateUserDto.phone);

    if (findUserByEmail && findUserByEmail.id !== Number(id)) {
      return responseData(
        null,
        "error",
        [{ key: "email", message: "Эта почта уже зарегистрирована" }],
        "Эта почта уже зарегистрирована",
      );
    }

    if (findUserByPhone && findUserByPhone.id !== Number(id)) {
      return responseData(
        null,
        "error",
        [{ key: "phone", message: "Номер телефона уже занят" }],
        "Номер телефона уже занят",
      );
    }

    try {
      await this.usersService.update(Number(id), updateUserDto);

      return responseData(null, "success", [], "Пользователь успешно изменен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin")
  @UseGuards(RolesGuard)
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<null>> {
    try {
      if (user.sub === Number(id)) {
        throw "Нельзя удалить пользователя";
      }

      await this.usersService.delete(Number(id));

      return responseData(null, "success", [], "Пользователь успешно удален");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
