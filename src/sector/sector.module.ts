import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorController } from './sector.controller';
import { SectorService } from './sector.service';
import { Sector } from './entities/sector.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sector])],
  controllers: [SectorController],
  providers: [SectorService],
  exports: [SectorService],
})
export class SectorModule {}
