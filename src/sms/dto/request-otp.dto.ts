import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'Некорректный формат номера телефона',
  })
  @IsNotEmpty({ message: 'Введите номер телефона' })
  phone: string;

  @IsOptional()
  @IsUUID('4', { message: 'Некорректный UUID устройства' })
  device_id?: string | null;

  @IsString()
  hash_code: string;
}
