import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon from 'argon2';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { CreateSmsOutboxDto } from './dto/create-sms-outbox.dto';
import { MarkFailedDto } from './dto/mark-failed.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  SMS_ERROR_STATUSES,
  SmsOutbox,
  SmsOutboxStatus,
} from './entities/sms-outbox.entity';

@Injectable()
export class SmsService {
  private readonly otp_ttl_ms: number = 5 * 60 * 1000; // 5 min

  constructor(
    @InjectRepository(SmsOutbox)
    private readonly smsRepository: Repository<SmsOutbox>,
    private readonly dataSource: DataSource,
  ) {}

  async requestOtp(
    dto: RequestOtpDto,
  ): Promise<{ phone: string; device_id: string }> {
    const phone = dto.phone;

    let outbox: SmsOutbox | null = null;

    if (dto.device_id) {
      outbox = await this.smsRepository.findOne({
        where: { device_id: dto.device_id },
      });
    }

    if (outbox) {
      const last = new Date(outbox.updated_at || outbox.created_at).getTime();
      const expiresAt = last + 60 * 1000;
      const dateNow = Date.now();

      if (dateNow < expiresAt) {
        const leftSecond = Math.ceil((expiresAt - dateNow) / 1000);
        throw `Повторная отправка возможна через ${leftSecond} сек`;
      }
    }

    const device_id = dto.device_id ?? randomUUID();
    const code = this.generateCode();
    const codeHash = await argon.hash(code).catch((error) => {
      throw `Не удалось создать хэш кода, ${error}`;
    });
    const messageText = `Код подтверждения: ${code}. Действует 5 минут. ${dto.hash_code}`;
    console.log(code);

    if (outbox) {
      await this.update(outbox.id, {
        phone,
        code_hash: codeHash,
        message_text: messageText,
      });
    } else {
      outbox = await this.create({
        phone,
        code_hash: codeHash,
        message_text: messageText,
        device_id,
      });
    }

    return { phone, device_id };
  }

  async create(dto: CreateSmsOutboxDto): Promise<SmsOutbox> {
    return this.smsRepository
      .save({
        phone: dto.phone,
        code_hash: dto.code_hash,
        message_text: dto.message_text,
        status: 'pending',
        device_id: dto.device_id || '',
      })
      .catch((error) => {
        throw `Не удалось создать запись на отправку SMS, ${error}`;
      });
  }

  async update(id: number, dto: CreateSmsOutboxDto) {
    return this.smsRepository
      .update(id, {
        phone: dto.phone,
        code_hash: dto.code_hash,
        message_text: dto.message_text,
        status: 'pending',
        sender_phones: [],
        verify_attempts: 0,
      })
      .catch((error) => {
        throw `Не удалось изменить запись на отправку SMS, ${error}`;
      });
  }

  async delete(id: number) {
    return this.smsRepository.delete(id).catch((error) => {
      throw `Не удалось удалить запись, ${error}`;
    });
  }

  async claimNext(sender_phone: string): Promise<SmsOutbox | null> {
    const sender = sender_phone.trim();
    const cutoff = new Date(Date.now() - this.otp_ttl_ms);

    await this.cleanupExpired(cutoff);

    const task = await this.dataSource.transaction(async (manager) => {
      const found = await manager
        .createQueryBuilder(SmsOutbox, 'sms')
        .where(
          `(sms.status = :pending
              OR (sms.status IN (:...errorStatuses) AND NOT (:sender = ANY(sms.sender_phones))))
           AND sms.updated_at > :cutoff`,
          {
            pending: 'pending',
            errorStatuses: SMS_ERROR_STATUSES,
            sender,
            cutoff,
          },
        )
        .orderBy("CASE WHEN sms.status = 'pending' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('sms.created_at', 'ASC')
        .limit(1)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getOne()
        .catch((error) => {
          throw `Не удалось получить запись на отправку SMS, ${error}`;
        });

      if (found) {
        found.status = 'in_work';
        found.sender_phones = [...(found.sender_phones ?? []), sender];

        await manager.save(found).catch((error) => {
          throw `Не удалось взять запись в работу, ${error}`;
        });
      }

      return found;
    });

    return task;
  }

  async markDelivered(id: number) {
    await this.getOneTaskById(id);

    await this.smsRepository
      .update(id, {
        status: 'delivered',
      })
      .catch((error) => {
        throw `Не удалось обновить статус для задачи ${id}, ${error}`;
      });
  }

  async markFailed(id: number, dto: MarkFailedDto) {
    await this.getOneTaskById(id);

    await this.smsRepository
      .update(id, {
        status: this.mapErrorCodeToStatus(dto.error_code),
      })
      .catch((error) => {
        throw `Не удалось обновить запись на отправку SMS, ${error}`;
      });
  }

  async getOneTaskById(id: number) {
    const record = await this.smsRepository
      .findOne({ where: { id } })
      .catch((error) => {
        throw `Не удалось получить запись на отправку SMS, ${error}`;
      });

    if (!record) {
      throw 'Запись на отправку SMS не найдена';
    }

    return record;
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<void> {
    const record = await this.smsRepository
      .findOne({
        where: { phone: dto.phone },
      })
      .catch((error) => {
        throw `Не удалось найти запись кода подтверждения, ${error}`;
      });

    if (!record) {
      throw 'Код не найден. Запросите новый код';
    }

    if (record.verify_attempts >= 5) {
      throw 'Превышено число попыток. Запросите новый код';
    }

    const updatedAt = new Date(
      record.updated_at || record.created_at,
    ).getTime();

    if (Date.now() > updatedAt + this.otp_ttl_ms) {
      await this.delete(record.id);
      throw 'Срок действия кода истёк. Запросите новый код';
    }

    const isValid = await argon
      .verify(record.code_hash, dto.code)
      .catch(() => false);

    if (!isValid) {
      await this.smsRepository
        .update(record.id, { verify_attempts: record.verify_attempts + 1 })
        .catch((error) => {
          throw `Не удалось обновить попытки ввода кода, ${error}`;
        });

      const left = 5 - record.verify_attempts;

      throw `Неверный код. Осталось попыток: ${left}`;
    } else {
      await this.delete(record.id);
    }
  }

  private async cleanupExpired(cutoff: Date): Promise<void> {
    await this.smsRepository
      .createQueryBuilder()
      .delete()
      .where('updated_at < :cutoff', { cutoff })
      .execute()
      .catch((error) => {
        throw `Не удалось очистить протухшие записи, ${error}`;
      });
  }

  private mapErrorCodeToStatus(errorCode?: string): SmsOutboxStatus {
    const errors: Record<string, SmsOutboxStatus> = {
      no_balance: 'failed_no_balance',
      insufficient_balance: 'failed_no_balance',
      invalid_number: 'failed_invalid_number',
      invalid_recipient: 'failed_invalid_number',
      gateway: 'failed_gateway',
      network: 'failed_gateway',
      timeout: 'failed_gateway',
    };

    return errorCode && errors[errorCode] ? errors[errorCode] : 'failed';
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
