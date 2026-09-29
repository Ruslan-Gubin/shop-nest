import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SectorService } from '../sector.service';
import { Sector } from '../entities/sector.entity';

describe('SectorService — getMainDeliveryWarehouseFromOrder', () => {
  let service: SectorService;
  let sectorRepository: { find: jest.Mock };

  // Квадрат вокруг точки (37.6, 55.75)
  const SQUARE = [
    [37.6, 55.75],
    [37.7, 55.75],
    [37.7, 55.85],
    [37.6, 55.85],
    [37.6, 55.75],
  ];

  const makeSector = (
    overrides: Partial<Sector> & { id: number; price: number },
  ) =>
    ({
      color: '#fff',
      min_sum: 0,
      coordinates: SQUARE,
      warehouse: {
        id: 1,
        is_active: true,
        is_public: true,
        address: { lat: 55.75, lng: 37.6 },
      },
      ...overrides,
    }) as unknown as Sector;

  beforeEach(async () => {
    sectorRepository = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectorService,
        { provide: getRepositoryToken(Sector), useValue: sectorRepository },
      ],
    }).compile();

    service = module.get<SectorService>(SectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('поиск сектора по координатам', () => {
    it('возвращает null, если координаты не переданы', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 100 }),
      ]);

      // На клиенте координаты приходят как null/undefined,
      // поэтому проверяем рантайм- guards при null-значениях.
      await expect(
        service.getMainDeliveryWarehouseFromOrder(
          undefined as unknown as number,
          55.8,
        ),
      ).resolves.toBeNull();
      await expect(
        service.getMainDeliveryWarehouseFromOrder(
          37.65,
          undefined as unknown as number,
        ),
      ).resolves.toBeNull();

      // findDeliverySectors вызывается всегда, координаты фильтруются
      // уже в цикле перебора секторов, поэтому null корректен.
      expect(sectorRepository.find).toHaveBeenCalled();
    });

    it('возвращает null, если ни один сектор не содержит точку', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 100 }),
      ]);

      await expect(
        service.getMainDeliveryWarehouseFromOrder(0, 0),
      ).resolves.toBeNull();
    });

    it('возвращает сектор, внутри которого находится точка', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 100 }),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector?.id).toBe(1);
    });

    it('принимает координаты в плоском виде — массив пар [lng, lat]', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 100, coordinates: SQUARE }),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector?.id).toBe(1);
    });

    it('игнорирует координаты с лишним уровнем вложенности (GeoJSON) — дыра в коде', async () => {
      // isPointInSector ждёт number[][] — массив пар.
      // Вложенный формат [[ [lng, lat], ... ]] не распознаётся,
      // поэтому сектор не находится. Если поддержка GeoJSON нужна —
      // это правка sector.service.ts, а не теста.
      sectorRepository.find.mockResolvedValue([
        makeSector({
          id: 1,
          price: 100,
          coordinates: [SQUARE] as unknown as number[][],
        }),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector).toBeNull();
    });

    it('игнорирует сектор с пустыми координатами', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 100, coordinates: [] }),
      ]);

      await expect(
        service.getMainDeliveryWarehouseFromOrder(37.65, 55.8),
      ).resolves.toBeNull();
    });
  });

  describe('выбор при нескольких подходящих секторах', () => {
    it('выбирает сектор с наименьшей ценой доставки', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({ id: 1, price: 500 }),
        makeSector({ id: 2, price: 200 }),
        makeSector({ id: 3, price: 350 }),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector?.id).toBe(2);
    });

    it('при одинаковой цене выбирает ближайший склад', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({
          id: 1,
          price: 200,
          warehouse: {
            id: 1,
            is_active: true,
            is_public: true,
            address: { lat: 56.5, lng: 38.5 },
          },
        } as any),
        makeSector({
          id: 2,
          price: 200,
          warehouse: {
            id: 2,
            is_active: true,
            is_public: true,
            address: { lat: 55.8, lng: 37.7 },
          },
        } as any),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector?.id).toBe(2);
    });

    it('не учитывает сектор, в точке где склад не имеет координат, только если у всех', async () => {
      sectorRepository.find.mockResolvedValue([
        makeSector({
          id: 1,
          price: 200,
          warehouse: { id: 1, is_active: true, is_public: true, address: null },
        } as any),
        makeSector({
          id: 2,
          price: 200,
          warehouse: {
            id: 2,
            is_active: true,
            is_public: true,
            address: { lat: 55.8, lng: 37.7 },
          },
        } as any),
      ]);

      const sector = await service.getMainDeliveryWarehouseFromOrder(
        37.65,
        55.8,
      );

      expect(sector?.id).toBe(2);
    });
  });

  describe('запрос секторов', () => {
    it('загружает только активные публичные склады вместе с адресом', async () => {
      await service.getMainDeliveryWarehouseFromOrder(37.65, 55.8);

      expect(sectorRepository.find).toHaveBeenCalledWith({
        where: { warehouse: { is_active: true, is_public: true } },
        relations: { warehouse: { address: true } },
        order: { id: 'ASC' },
      });
    });
  });
});
