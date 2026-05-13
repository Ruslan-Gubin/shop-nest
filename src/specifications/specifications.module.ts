import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SpecificationsService } from "./specifications.service";
import { SpecificationsController } from "./specifications.controller";
import { Specification } from "./entities/specification.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Specification])],
  controllers: [SpecificationsController],
  providers: [SpecificationsService],
})
export class SpecificationsModule {}
