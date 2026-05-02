import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles) {
      const role = context.switchToHttp().getRequest().user.role;
      const isForbidden = !role || !requiredRoles.includes(role);

      if (isForbidden) {
        throw new ForbiddenException("Нет доступна к данным");
      }
    }

    return true;
  }
}
