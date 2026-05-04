import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon from "argon2";
import type { User } from "src/users/entities/user.entity";
import { UsersService } from "src/users/users.service";
import type { SignInDto } from "./dto/sign-in.dto";
import type { Tokens } from "./types/tokens.type";
import { CreateUserDto } from "src/users/dto/create-user.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private usersService: UsersService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<Tokens> {
    const user = await this.usersService.create(createUserDto);

    const tokens = await this.getAccessAndRefreshToken(user);

    return tokens;
  }

  async signIn(data: SignInDto): Promise<Tokens | null> {
    const user = await this.usersService.findByEmail(data.email);

    if (user) {
      const passwordsMatch = await argon.verify(user.password, data.password);

      if (passwordsMatch) {
        return await this.getAccessAndRefreshToken(user);
      } else {
        throw "Неверный адрес электронной почты или пароль";
      }
    }

    return null;
  }

  async logout(id: number) {
    return this.usersService.updateRefresh(id, "");
  }

  async refreshToken(id: number, refresh: string) {
    const user = await this.usersService.findById(id);

    if (user) {
      const refreshTokensMatch = await argon.verify(user.refresh, refresh);

      if (!refreshTokensMatch) {
        throw "Токены не совпали";
      }

      return await this.getAccessAndRefreshToken(user);
    }

    return null;
  }

  private async hash(data: string) {
    return argon.hash(data);
  }

  private async getAccessAndRefreshToken(user: User): Promise<Tokens> {
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.password,
      user.role,
      user.name,
    );

    await this.updateRefreshToken(user.id, tokens.refresh);
    return tokens;
  }

  private async generateTokens(
    id: number,
    email: string,
    password: string,
    role: string,
    name: string,
  ): Promise<Tokens> {
    const payload = {
      sub: id,
      password,
      role,
      email,
      name,
    };
    return new Promise((res) => {
      this.jwt
        .signAsync(payload, {
          secret: process.env.JWT_SECRET,
          expiresIn: 60 * 15, // 15 min
        })
        .then((token) => {
          this.jwt
            .signAsync(payload, {
              secret: process.env.REFRESH_TOKEN_SECRET,
              expiresIn: 60 * 60 * 24 * 7,
            })
            .then((refresh) => {
              res({ token, refresh });
            })
            .catch(() => {
              throw "Не удалось создать токен";
            });
        })
        .catch(() => {
          throw "Не удалось создать токен";
        });
    });
  }

  private async getHashedRefreshToken(refresh: string) {
    return this.hash(refresh).catch(() => {
      throw "Не удалось обработать токен";
    });
  }

  private async updateRefreshToken(id: number, refresh: string) {
    const hashedRefreshToken = await this.getHashedRefreshToken(refresh);
    await this.usersService.updateRefresh(id, hashedRefreshToken);
  }
}
