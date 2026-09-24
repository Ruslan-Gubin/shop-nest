import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> | null }>();

    return !data ? (req.user ?? null) : (req.user?.[data] ?? null);
  },
);
