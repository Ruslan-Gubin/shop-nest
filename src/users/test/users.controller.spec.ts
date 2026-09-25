import { Test, type TestingModule } from '@nestjs/testing';
import type { CurrentStrategyUser } from '../../auth/types/current-user';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController — updateProfile', () => {
  let controller: UsersController;

  const currentUser: CurrentStrategyUser = {
    sub: 7,
    password: 'hashedPassword123',
    iat: 1,
    exp: 2,
    refresh: 'refresh',
    role: 'user',
    email: 'user@example.com',
    name: 'Пользователь',
    phone: '+79991234567',
  };

  const mockUsersService = {
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('должен обновлять профиль текущего пользователя и возвращать null', async () => {
    const dto = { name: 'Новое имя', email: 'new@example.com' };
    mockUsersService.updateProfile.mockResolvedValue(undefined);

    const result = await controller.updateProfile(currentUser, dto);

    expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
      currentUser.sub,
      dto,
    );
    expect(result).toEqual({
      data: null,
      status: 'success',
      message: 'Пользователь успешно изменен',
      errors: [],
    });
  });

  it('должен возвращать общую ошибку сервиса', async () => {
    mockUsersService.updateProfile.mockRejectedValue(new Error('DB failed'));

    const result = await controller.updateProfile(currentUser, { name: 'Имя' });

    expect(result.data).toBeNull();
    expect(result.status).toBe('error');
    expect(result.message).toBe('DB failed');
  });
});
