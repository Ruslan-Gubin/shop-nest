import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class SignInDto {
  @IsString()
  @IsEmail({}, { message: "Некорректный формат почты" })
  @IsNotEmpty({ message: "Введите почту" })
  email: string;

  @IsString()
  @MaxLength(50, { message: "Пароль не должен превышать 50 символов" })
  @MinLength(6, { message: "Пароль должен быть не менее 6 символов" })
  @IsNotEmpty({ message: "Введите пароль" })
  password: string;
}
