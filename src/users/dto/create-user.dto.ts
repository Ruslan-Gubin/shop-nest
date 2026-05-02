import {
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { SignInDto } from "src/auth/dto/sign-in.dto";

export class CreateUserDto extends SignInDto {
  @IsString()
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(3, { message: "Имя должно содержать минимум 3 символа" })
  @IsNotEmpty({ message: "Введите имя" })
  name: string;

  @IsString()
  @Matches(
    /^(\+?\d{1,3})?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10,15}$/,
    {
      message: "Некорректный формат номера телефона",
    },
  )
  @MaxLength(25, { message: "Некорректный формат номера телефона" })
  @MinLength(8, { message: "Телефон должно содержать минимум 8 символов" })
  @IsNotEmpty({ message: "Введите номер телефона" })
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: "Максимум 20 символов" })
  @MinLength(3, { message: "Роль должно содержать минимум 3 символа" })
  role: string;

  @IsString()
  @IsOptional()
  refresh: string;
}
