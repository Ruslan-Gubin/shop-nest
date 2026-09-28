import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateSectorDto } from './dto/update-sectors.dto';
import { Sector } from './entities/sector.entity';

@Injectable()
export class SectorService {
  constructor(
    @InjectRepository(Sector)
    private readonly sectorRepository: Repository<Sector>,
  ) {}

  async findByWarehouseId(warehouse_id: number) {
    return this.sectorRepository
      .find({
        where: { warehouse: { id: warehouse_id } },
        order: { id: 'ASC' },
      })
      .catch((error) => {
        throw `Не удалось получить сектора склада, ${error.message}`;
      });
  }

  async getAllDelivery() {
    return this.sectorRepository
      .find({
        where: { warehouse: { is_active: true, is_public: true } },
        order: { id: 'ASC' },
      })
      .catch((error) => {
        throw `Не удалось получить сектора склада, ${error.message}`;
      });
  }

  async updateSectors(warehouse_id: number, sectors: UpdateSectorDto[]) {
    const prevSelectors = await this.findByWarehouseId(warehouse_id);
    const prevSelectorsIds = prevSelectors.map((el) => el.id);

    for (let i = 0; i < sectors.length; i++) {
      const sector = sectors[i];

      if (typeof sector.id !== 'number') {
        await this.sectorRepository.save({
          color: sector.color,
          coordinates: sector.coordinates,
          price: sector.price,
          min_sum: sector.min_sum,
          warehouse: { id: warehouse_id },
        });
      } else if (typeof sector.id === 'number') {
        await this.sectorRepository.update(sector.id, {
          color: sector.color,
          coordinates: sector.coordinates,
          price: sector.price,
          min_sum: sector.min_sum,
        });

        if (prevSelectorsIds.includes(sector.id)) {
          prevSelectorsIds.filter((el) => el !== sector.id);
        }
      }
    }

    for (let i = 0; i < prevSelectorsIds.length; i++) {
      const id = prevSelectorsIds[i];
      await this.sectorRepository.delete(id);
    }
  }
}
