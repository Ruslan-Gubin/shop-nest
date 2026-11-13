import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignInPhoneDto {
  @IsString()
  @Matches(
    /^(\+?\d{1,3})?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10,15}$/,
    {
      message: 'Некорректный формат номера телефона',
    },
  )
  @MaxLength(25, { message: 'Некорректный формат номера телефона' })
  @MinLength(8, { message: 'Телефон должно содержать минимум 8 символов' })
  @IsNotEmpty({ message: 'Введите номер телефона' })
  phone: string;

  @IsString()
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  @IsNotEmpty({ message: 'Введите пароль' })
  password: string;
}
