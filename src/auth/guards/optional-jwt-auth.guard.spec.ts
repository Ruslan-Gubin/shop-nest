import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as passport from 'passport';
import * as jwt from 'jsonwebtoken';
import type { Request as ExpressRequest } from 'express';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const SECRET = 'test-secret';

/** Заглушка JWT-стратегии: читает Bearer, верифицирует jsonwebtoken. */
class FakeJwtStrategy extends passport.Strategy {
  override name = 'jwt';

  override authenticate(req: ExpressRequest): void {
    const header = req.headers?.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      this.fail({ message: 'No auth token' }, 401);
      return;
    }

    try {
      this.success(jwt.verify(token, SECRET) as jwt.JwtPayload);
    } catch (err) {
      this.fail({ message: (err as Error).message }, 401);
    }
  }
}

beforeAll(() => {
  passport.use('jwt', new FakeJwtStrategy());
});

type FakeRequest = {
  headers: Record<string, string>;
  user?: unknown;
};

const makeContext = (request: FakeRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => () => undefined,
    getClass: () => Object,
  }) as unknown as ExecutionContext;

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();

  it('без Authorization-заголовка → аноним (req.user = null)', () => {
    const request: FakeRequest = { headers: {} };
    const ctx = makeContext(request);

    // Ветка без заголовка синхронная: canActivate возвращает true, не промис
    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toBeNull();
  });

  it('с валидным JWT → req.user = payload', async () => {
    const token = jwt.sign({ sub: 1, role: 'user' }, SECRET);
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    };
    const ctx = makeContext(request);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 1, role: 'user' });
  });

  it('с битым/протухшим JWT → 401', async () => {
    const request: FakeRequest = {
      headers: { authorization: 'Bearer not-a-token' },
    };
    const ctx = makeContext(request);

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
