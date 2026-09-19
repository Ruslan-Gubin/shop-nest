import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Запрос устройства-отправителя: номер телефона устройства, которое готово взять задачу (строка цифр, как пришёл). */
export class GetOutboxDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'Некорректный формат номера телефона',
  })
  @MaxLength(15, { message: 'Некорректный формат номера телефона' })
  @MinLength(10, { message: 'Некорректный формат номера телефона' })
  @IsNotEmpty({ message: 'Укажите номер устройства-отправителя' })
  sender_phone: string;
}
