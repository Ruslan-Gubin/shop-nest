import { type ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: unknown;
    }>();

    const authorization: string = request?.headers?.authorization ?? "";
    const isHasAuthToken = authorization.length > 7;

    if (!isHasAuthToken) {
      request.user = null;
    }

    return isHasAuthToken ? super.canActivate(context) : true;
  }
}
