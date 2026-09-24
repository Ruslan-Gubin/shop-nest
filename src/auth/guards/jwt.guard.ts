import { type ExecutionContext, Injectable } from "@nestjs/common";
import { CUSTOM_ROUTE_ARGS_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private handlerDeclaresCurrentUser(context: ExecutionContext): boolean {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, context.getClass(), context.getHandler().name) ?? {};

    return Object.keys(args).some((key) => key.includes(CUSTOM_ROUTE_ARGS_METADATA));
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      return super.canActivate(context);
    }

    if (this.handlerDeclaresCurrentUser(context)) {
      const auth = context.switchToHttp().getRequest()?.headers?.authorization;
      const hasToken =
        typeof auth === "string" && auth.startsWith("Bearer ") && auth.length > "Bearer ".length;
      if (hasToken) {
        return super.canActivate(context);
      }
    }

    return true;
  }
}
