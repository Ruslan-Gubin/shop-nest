import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class RefreshTokenGuard extends AuthGuard("refresh-token") {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any) {
    if (err) {
      throw new ForbiddenException("Не удалось обновить токен");
    }

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    return user;
  }
}
