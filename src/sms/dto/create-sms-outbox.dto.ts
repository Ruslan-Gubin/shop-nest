import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateSmsOutboxDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: "Некорректный формат номера телефона",
  })
  @MaxLength(15, { message: "Некорректный формат номера телефона" })
  @MinLength(10, { message: "Некорректный формат номера телефона" })
  @IsNotEmpty({ message: "Введите номер телефона" })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: "Хэш кода обязателен" })
  code_hash: string;

  @IsString()
  @MaxLength(200, { message: "Максимум 200 символов" })
  @IsNotEmpty({ message: "Текст сообщения обязателен" })
  message_text: string;

  @IsOptional()
  @IsString()
  device_id?: string | null;
}
