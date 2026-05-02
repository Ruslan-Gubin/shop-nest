import {
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  Matches,
  IsEmail,
} from "class-validator";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(3, { message: "Имя должно содержать минимум 3 символа" })
  name: string;

  @IsString()
  @IsOptional()
  @Matches(
    /^(\+?\d{1,3})?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10,15}$/,
    {
      message: "Некорректный формат номера телефона",
    },
  )
  @MaxLength(25, { message: "Некорректный формат номера телефона" })
  @MinLength(8, { message: "Телефон должно содержать минимум 8 символов" })
  phone: string;

  @IsString()
  @IsEmail({}, { message: "Некорректный формат почты" })
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: "Пароль не должен превышать 50 символов" })
  @MinLength(6, { message: "Пароль должен быть не менее 6 символов" })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: "Максимум 20 символов" })
  @MinLength(3, { message: "Роль должно содержать минимум 3 символа" })
  role: string;
}
