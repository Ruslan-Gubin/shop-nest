import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import type { SetShortageDto } from 'src/order-product/dto/set-shortage.dto';
import type { CurrentStrategyUser } from 'src/auth/types/current-user';

// ─── Контроллер: PATCH /orders/shortage/:id и POST /orders/accept-shortage/:id ──

describe('OrdersController — shortage endpoints', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    setShortageStocks: jest.fn(),
    acceptShortage: jest.fn(),
  };

  const mockUser: CurrentStrategyUser = {
    sub: 7,
    email: 'user@test.com',
    role: 'user',
    name: 'Пользователь',
    password: '',
    iat: 123,
    exp: 456,
    refresh: 'refresh',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);

    jest.clearAllMocks();
  });

  describe('PATCH shortage/:id', () => {
    const dto = {
      items: [{ id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 }],
    } as SetShortageDto;

    it('вызывает сервис с Number(id) и dto.items, возвращает success', async () => {
      mockOrdersService.setShortageStocks.mockResolvedValue(undefined);

      const result = await controller.setShortageStocks('42', dto);

      expect(mockOrdersService.setShortageStocks).toHaveBeenCalledWith(
        42,
        dto.items,
      );
      expect(result.status).toBe('success');
      expect(result.data).toBeNull();
      expect(result.message).toBe('Запрос на изменение остатков обновлен');
    });

    it('возвращает error с текстом ошибки сервиса', async () => {
      mockOrdersService.setShortageStocks.mockRejectedValue(
        'Невозможно установить дефицит для заказа в статусе completed',
      );

      const result = await controller.setShortageStocks('42', dto);

      expect(result.status).toBe('error');
      expect(result.data).toBeNull();
      expect(result.message).toBe(
        'Невозможно установить дефицит для заказа в статусе completed',
      );
    });

    it('извлекает message из Error', async () => {
      mockOrdersService.setShortageStocks.mockRejectedValue(
        new Error('DB failed'),
      );

      const result = await controller.setShortageStocks('42', dto);

      expect(result.status).toBe('error');
      expect(result.message).toBe('DB failed');
    });

    it('пустой message у Error → запасной «Ошибка на стороне сервера»', async () => {
      mockOrdersService.setShortageStocks.mockRejectedValue(new Error(''));

      const result = await controller.setShortageStocks('42', dto);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Ошибка на стороне сервера');
    });

    it('защищён ролями admin и moderator', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        OrdersController.prototype.setShortageStocks,
      );

      expect(roles).toEqual(['admin', 'moderator']);
    });
  });

  describe('POST accept-shortage/:id', () => {
    it('вызывает сервис с user.sub и user.role, возвращает success', async () => {
      mockOrdersService.acceptShortage.mockResolvedValue(undefined);

      const result = await controller.acceptShortage('7', mockUser);

      expect(mockOrdersService.acceptShortage).toHaveBeenCalledWith(
        7,
        mockUser.sub,
        mockUser.role,
      );
      expect(result.status).toBe('success');
      expect(result.data).toBeNull();
      expect(result.message).toBe('Изменения по остаткам приняты');
    });

    it('возвращает error с текстом ошибки сервиса', async () => {
      mockOrdersService.acceptShortage.mockRejectedValue(
        'Нет изменений по остаткам для принятия',
      );

      const result = await controller.acceptShortage('7', mockUser);

      expect(result.status).toBe('error');
      expect(result.data).toBeNull();
      expect(result.message).toBe('Нет изменений по остаткам для принятия');
    });

    it('доступен без ограничения по ролям (владелец, admin, moderator)', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        OrdersController.prototype.acceptShortage,
      );

      expect(roles).toBeUndefined();
    });
  });
});
