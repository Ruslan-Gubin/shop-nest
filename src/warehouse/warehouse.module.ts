import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WarehouseController } from "./warehouse.controller";
import { WarehouseService } from "./warehouse.service";
import { Warehouse } from "./entities/warehouse.entity";
import { AddressModule } from "src/address/address.module";

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse]), AddressModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
