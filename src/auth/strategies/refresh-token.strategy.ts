import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { CurrentStrategyUser } from "../types/current-user";

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  "refresh-token",
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.REFRESH_TOKEN_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: 
    CurrentStrategyUser,
  ): Promise<{
    sub: number;
    password: string;
    iat: number;
    exp: number;
    refresh: string;
    role: string;
    email: string;
    name: string;
  }> {
    const authorization = req.get("Authorization") ?? "";
    const refresh = authorization.replace("Bearer", "").trim();
    return {
      ...payload,
      refresh,
    };
  }
}
