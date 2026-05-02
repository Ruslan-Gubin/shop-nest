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
} from "@nestjs/common";
import { User } from "src/users/entities/user.entity";
import { UsersService } from "./users.service";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { ResponseData, responseData } from "src/helpers/response";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { CurrentStrategyUser } from "src/auth/types/current-user";
import { UpdateUserDto } from "./dto/update-user-dto";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("create")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseData<User | null>> {
    const findUserByEmail = await this.usersService.findByEmail(createUserDto.email);

    if (findUserByEmail) {
      return responseData(
        null,
        "error",
        [{ key: "email", message: "Эта почта уже зарегистрирована" }],
        "",
      );
    }

    try {
      const user = await this.usersService.create(createUserDto);
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
  @Get(":id")
  async findOne(
    @Param("id") id: string,
  ): Promise<ResponseData<Omit<User, "password" | "refresh"> | null>> {
    try {
      const user = await this.usersService.findById(Number(id));

      if (!user) {
        throw "Пользователь не найден";
      }

      //@ts-ignore
      const { password, refresh, ...rest } = user;

      return responseData(rest, "success", [], "Пользователь получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponseData<null>> {
    const findUserByEmail = await this.usersService.findByEmail(updateUserDto.email);
    if (findUserByEmail && findUserByEmail.id !== Number(id)) {
      return responseData(
        null,
        "error",
        [{ key: "email", message: "Эта почта уже зарегистрирована" }],
        "",
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
