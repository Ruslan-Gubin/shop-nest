import { Module } from "@nestjs/common";
import { PsbSbpService } from "./psb.service";

@Module({
  providers: [PsbSbpService],
  exports: [PsbSbpService],
})
export class PsbModule {}
