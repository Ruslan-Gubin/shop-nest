import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { responseData, ResponseData } from "src/helpers/response";
import { SmsOutbox } from "./entities/sms-outbox.entity";
import { SmsService } from "./sms.service";
import { RequestOtpDto } from "./dto/request-otp.dto";

@Controller("sms")
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Public()
  @Post("/request-otp")
  async requestOtp(
    @Body() dto: RequestOtpDto,
  ): Promise<ResponseData<{ phone: string; device_id: string } | null>> {
    try {
      const result = await this.smsService.requestOtp(dto);

      return responseData(result, "success", [], "Создан запрос на отправку SMS");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Public()
  @Get("/outbox")
  async getOutbox(@Query("phone") phone?: string): Promise<ResponseData<SmsOutbox[] | null>> {
    try {
      const messages = await this.smsService.getPending(phone);

      return responseData(messages, "success", [], "");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  /** Устройство отправило SMS — запись удаляется из очереди. */
  @Public()
  @Post("/outbox/:id/delivered")
  async markDelivered(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ResponseData<boolean | null>> {
    try {
      await this.smsService.markDelivered(id);

      return responseData(true, "success", [], "");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  /** Устройство не смогло отправить SMS — попытка доставки засчитана. */
  @Public()
  @Post("/outbox/:id/failed")
  async markFailed(@Param("id", ParseIntPipe) id: number): Promise<ResponseData<SmsOutbox | null>> {
    try {
      const record = await this.smsService.markFailed(id);

      return responseData(record, "success", [], "");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
