import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'Некорректный формат номера телефона',
  })
  @MaxLength(15, { message: 'Некорректный формат номера телефона' })
  @MinLength(10, { message: 'Некорректный формат номера телефона' })
  @IsNotEmpty({ message: 'Введите номер телефона' })
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Код должен содержать 6 цифр' })
  @IsNotEmpty({ message: 'Введите код' })
  code: string;
}
