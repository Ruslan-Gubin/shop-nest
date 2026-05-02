import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtService, RefreshTokenStrategy, AuthService],
})
export class AuthModule { }
