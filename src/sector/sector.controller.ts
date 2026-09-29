import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UpdateSectorDto } from './dto/update-sectors.dto';
import { Sector } from './entities/sector.entity';
import { SectorService } from './sector.service';
import { ResponseData, responseData } from 'src/helpers/response';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('sectors')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get('warehouse/:warehouse_id')
  async findByWarehouseId(
    @Param('warehouse_id', ParseIntPipe) warehouse_id: number,
  ): Promise<ResponseData<Sector[] | null>> {
    try {
      const sectors = await this.sectorService.findByWarehouseId(warehouse_id);

      return responseData(sectors, 'success', [], 'Сектора склада получены');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Get('delivery')
  async getAllDelivery(): Promise<ResponseData<Sector[] | null>> {
    try {
      const sectors = await this.sectorService.getAllDelivery();

      return responseData(
        sectors,
        'success',
        [],
        'Все сектора доставки получены',
      );
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Patch('warehouse/:warehouse_id')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  async updateSectors(
    @Param('warehouse_id', ParseIntPipe) warehouse_id: number,
    @Body(new ParseArrayPipe({ items: UpdateSectorDto }))
    updateSectorsDto: UpdateSectorDto[],
  ): Promise<ResponseData<Sector[] | null>> {
    try {
      await this.sectorService.updateSectors(warehouse_id, updateSectorsDto);

      return responseData(null, 'success', [], 'Сектора склада сохранены');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }
}
