import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { responseData, ResponseData } from 'src/helpers/response';
import { SmsOutbox } from './entities/sms-outbox.entity';
import { SmsService } from './sms.service';
import { GetOutboxDto } from './dto/get-outbox.dto';
import { MarkFailedDto } from './dto/mark-failed.dto';
import { RequestOtpDto } from './dto/request-otp.dto';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Public()
  @Post('/request-otp')
  async requestOtp(
    @Body() dto: RequestOtpDto,
  ): Promise<ResponseData<{ phone: string; device_id: string } | null>> {
    try {
      const result = await this.smsService.requestOtp(dto);

      return responseData(
        result,
        'success',
        [],
        'Создан запрос на отправку SMS',
      );
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Public()
  @Get('/outbox')
  async getOutbox(
    @Query() dto: GetOutboxDto,
  ): Promise<ResponseData<SmsOutbox | null>> {
    try {
      const message = await this.smsService.claimNext(dto.sender_phone);

      return responseData(
        message,
        'success',
        [],
        'Получена новая задача на отправку sms',
      );
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Public()
  @Post('/outbox-delivered/:id')
  async markDelivered(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseData<SmsOutbox | null>> {
    try {
      await this.smsService.markDelivered(id);

      return responseData(null, 'success', [], 'Задача успешно завершена');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Public()
  @Post('/outbox-failed/:id')
  async markFailed(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkFailedDto,
  ): Promise<ResponseData<SmsOutbox | null>> {
    try {
      await this.smsService.markFailed(id, dto);

      return responseData(
        null,
        'success',
        [],
        'Операция завершилась, ошибку записали в запись',
      );
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }
}
