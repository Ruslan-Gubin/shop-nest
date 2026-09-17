import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RequestOtpDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: "Некорректный формат номера телефона",
  })
  @MaxLength(15, { message: "Некорректный формат номера телефона" })
  @MinLength(10, { message: "Некорректный формат номера телефона" })
  @IsNotEmpty({ message: "Введите номер телефона" })
  phone: string;

  @IsOptional()
  @IsUUID("4", { message: "Некорректный UUID устройства" })
  device_id?: string | null;
}
