import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { UpdateSectorDto } from "./dto/update-sectors.dto";
import { Sector } from "./entities/sector.entity";
import { haversine } from "src/helpers/haversine";

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
        order: { id: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить сектора склада, ${error.message}`;
      });
  }

  async getAllDelivery() {
    return this.sectorRepository
      .find({
        where: { warehouse: { is_active: true, is_public: true } },
        order: { id: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить сектора склада, ${error.message}`;
      });
  }

  private async findDeliverySectors(): Promise<Sector[]> {
    return this.sectorRepository
      .find({
        where: { warehouse: { is_active: true, is_public: true } },
        relations: { warehouse: { address: true } },
        order: { id: "ASC" },
      })
      .catch((error) => {
        throw `Не удалось получить сектора доставки, ${error.message}`;
      });
  }

  async updateSectors(warehouse_id: number, sectors: UpdateSectorDto[]) {
    const prevSelectors = await this.findByWarehouseId(warehouse_id);
    const prevSelectorsIds = prevSelectors.map((el) => el.id);

    for (let i = 0; i < sectors.length; i++) {
      const sector = sectors[i];

      if (typeof sector.id !== "number") {
        await this.sectorRepository.save({
          color: sector.color,
          coordinates: sector.coordinates,
          price: sector.price,
          min_sum: sector.min_sum,
          warehouse: { id: warehouse_id },
        });
      } else if (typeof sector.id === "number") {
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

  async getMainDeliveryWarehouseFromOrder(lng: number, lat: number): Promise<Sector | null> {
    const sectors = await this.findDeliverySectors();
    let result: Sector | null = null;
    let distance = 0;

    for (let i = 0; i < sectors.length; i++) {
      const sector = sectors[i];
      const isPointInSector = this.isPointInSector(sector.coordinates, lng, lat);

      if (isPointInSector && sector?.warehouse?.address?.lng && sector?.warehouse?.address?.lat) {
        const sectorDistance = haversine(
          lat,
          lng,
          sector.warehouse.address.lat,
          sector.warehouse.address.lng,
        );

        if (
          result === null ||
          (result && result.price > sector.price) ||
          (result && result.price === sector.price && distance > sectorDistance)
        ) {
          result = sector;
          distance = sectorDistance;
        }
      }
    }

    return result;
  }

  private isPointInSector(coordinates: number[][], lng: number, lat: number): boolean {
    let isInside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const pointI = coordinates[i];
      const pointJ = coordinates[j];

      if (
        !Array.isArray(pointI) ||
        pointI.length !== 2 ||
        !Array.isArray(pointJ) ||
        pointJ.length !== 2
      )
        continue;

      const [xi, yi] = pointI;
      const [xj, yj] = pointJ;

      if (typeof xi !== "number" || typeof yi !== "number") continue;
      if (typeof xj !== "number" || typeof yj !== "number") continue;

      const isCrossing = yi > lat !== yj > lat;
      const intersectLng = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (isCrossing && lng < intersectLng) {
        isInside = !isInside;
      }
    }

    return isInside;
  }
}
