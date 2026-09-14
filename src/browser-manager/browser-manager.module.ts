import { Global, Module } from '@nestjs/common';
import { BrowserManagerService } from './browser-manager.service';

@Global()
@Module({
  providers: [BrowserManagerService],
  exports: [BrowserManagerService],
})
export class BrowserManagerModule {}
