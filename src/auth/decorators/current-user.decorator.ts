import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    if (!data) {
      return req.user;
    }

    return req.user[data];
  },
);
