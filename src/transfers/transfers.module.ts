import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { Transfer } from './entities/transfer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transfer])],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
