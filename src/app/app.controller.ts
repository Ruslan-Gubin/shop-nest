import { Controller, Get } from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { responseData } from "src/helpers/response";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get("connect")
  async connect(): Promise<{ status: string; data: null; message: string }> {
    return responseData(null, "success", [], "Соединение восстановлено");
  }
}
