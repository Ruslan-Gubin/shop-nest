import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderProductService } from '../order-product.service';
import { OrderProduct } from '../entities/order-product.entity';

// ─── Базовые фабрики данных ────────────────────────────────
//
// setShortageStocks — валидация и запись дефицита на товар заказа:
//   - каждый id должен существовать в order_products
//   - quantity >= 0 и <= заказанного количества
//   - резервация (склад + остаток) должна участвовать в заказе
//   - один и тот же товар обновляется один раз (кеш по id)

describe('OrderProductService — setShortageStocks', () => {
  const baseProduct = (overrides?: Record<string, any>) => ({
    id: 10,
    order_id: 1,
    product_id: 100,
    name: 'Товар А',
    quantity: 10,
    price: 500,
    reservations: [{ stock_id: 1, warehouse_id: 1, quantity: 10 }],
    shortage_stocks: [],
    transfers: [],
    ...overrides,
  });

  let service: OrderProductService;

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProductService,
        { provide: getRepositoryToken(OrderProduct), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OrderProductService>(OrderProductService);

    jest.clearAllMocks();

    mockRepository.findOne.mockResolvedValue(baseProduct() as any);
    mockRepository.update.mockResolvedValue({} as any);
  });

  // ─── A. Успешные сценарии ──────────────────────────────

  describe('A. Успешные сценарии', () => {
    it('добавляет дефицит, если его ещё не было (10 → 5)', async () => {
      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
      ]);

      expect(mockRepository.update).toHaveBeenCalledWith(10, {
        shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
      });
    });

    it('обновляет существующий дефицит (5 → 3)', async () => {
      mockRepository.findOne.mockResolvedValue(
        baseProduct({
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }) as any,
      );

      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 3 },
      ]);

      expect(mockRepository.update).toHaveBeenCalledWith(10, {
        shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 3 }],
      });
    });

    it('снимает дефицит, если quantity равно резервации (10 = 10)', async () => {
      mockRepository.findOne.mockResolvedValue(
        baseProduct({
          shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
        }) as any,
      );

      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 10 },
      ]);

      expect(mockRepository.update).toHaveBeenCalledWith(10, {
        shortage_stocks: [],
      });
    });

    it('объединяет несколько позиций одного товара (по складам) и делает 1 update', async () => {
      mockRepository.findOne.mockResolvedValue(
        baseProduct({
          reservations: [
            { stock_id: 1, warehouse_id: 1, quantity: 6 },
            { stock_id: 2, warehouse_id: 2, quantity: 4 },
          ],
        }) as any,
      );

      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
        { id: 10, stock_id: 2, warehouse_id: 2, quantity: 3 },
      ]);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(1); // кеш по id
      expect(mockRepository.update).toHaveBeenCalledTimes(1); // один update на товар
      expect(mockRepository.update).toHaveBeenCalledWith(10, {
        shortage_stocks: [
          { stock_id: 1, warehouse_id: 1, quantity: 5 },
          { stock_id: 2, warehouse_id: 2, quantity: 3 },
        ],
      });
    });

    it('обновляет несколько разных товаров', async () => {
      mockRepository.findOne.mockImplementation(async (options: any) =>
        options?.where?.id === 10
          ? baseProduct({ id: 10, quantity: 10 })
          : baseProduct({
              id: 20,
              product_id: 200,
              name: 'Товар Б',
              quantity: 20,
              reservations: [{ stock_id: 2, warehouse_id: 1, quantity: 20 }],
            }),
      );

      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
        { id: 20, stock_id: 2, warehouse_id: 1, quantity: 15 },
      ]);

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockRepository.update).toHaveBeenCalledWith(10, {
        shortage_stocks: [{ stock_id: 1, warehouse_id: 1, quantity: 5 }],
      });
      expect(mockRepository.update).toHaveBeenCalledWith(20, {
        shortage_stocks: [{ stock_id: 2, warehouse_id: 1, quantity: 15 }],
      });
    });

    it('дважды один и тот же id в запросе → findOne вызывается один раз', async () => {
      mockRepository.findOne.mockImplementation(async (options: any) =>
        options?.where?.id === 10 ? baseProduct() : null,
      );

      await service.setShortageStocks([
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
        { id: 10, stock_id: 1, warehouse_id: 1, quantity: 4 },
      ]);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ─── B. Валидация ──────────────────────────────────────

  describe('B. Валидация', () => {
    it('товар не найден → ошибка и update не вызывается', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setShortageStocks([
          { id: 999, stock_id: 1, warehouse_id: 1, quantity: 5 },
        ]),
      ).rejects.toBe('Товар заказа с ID 999 не найден.');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('quantity больше заказанного → ошибка', async () => {
      await expect(
        service.setShortageStocks([
          { id: 10, stock_id: 1, warehouse_id: 1, quantity: 15 },
        ]),
      ).rejects.toBe(
        'Количество 15 для товара заказа 10 не может превышать заказанное 10',
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('резервация склада не участвует в заказе → ошибка', async () => {
      await expect(
        service.setShortageStocks([
          { id: 10, stock_id: 99, warehouse_id: 1, quantity: 5 },
        ]),
      ).rejects.toBe(
        'Остаток 99 на складе 1 не участвует в резервациях товара заказа 10',
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('пишет дефицит только по успешному проходу всех позиций', async () => {
      mockRepository.findOne.mockImplementation(async (options: any) =>
        options?.where?.id === 10 ? baseProduct() : null,
      );

      await expect(
        service.setShortageStocks([
          { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 },
          { id: 999, stock_id: 1, warehouse_id: 1, quantity: 2 },
        ]),
      ).rejects.toBe('Товар заказа с ID 999 не найден.');

      // валидация падает до записи — update ни для кого не вызван
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
