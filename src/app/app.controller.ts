import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  connect(): { status: string; data: null; message: string } {
    return {
      status: 'success',
      data: null,
      message: 'Соединение востановленно',
    };
  }
}
