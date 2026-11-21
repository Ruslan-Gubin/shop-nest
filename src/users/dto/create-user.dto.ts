import { Transform } from "class-transformer";
import {
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsEmail,
  ValidateIf,
} from "class-validator";
import { UserRole } from "../entities/user.entity";

export class CreateUserDto {
  @IsString()
  @ValidateIf((_, value: unknown) => typeof value === "string" && value.length > 0)
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(3, { message: "Имя должно содержать минимум 3 символа" })
  name: string;

  @IsString()
  @ValidateIf((_, value: unknown) => typeof value === "string" && value.length > 0)
  @IsEmail({}, { message: "Некорректный формат почты" })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" && value.length > 0 ? value : null,
  )
  email: string | null;

  @IsString()
  @MaxLength(50, { message: "Пароль не должен превышать 50 символов" })
  @MinLength(6, { message: "Пароль должен быть не менее 6 символов" })
  @IsNotEmpty({ message: "Введите пароль" })
  password: string;

  @IsString()
  @Matches(/^(\+?\d{1,3})?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10,15}$/, {
    message: "Некорректный формат номера телефона",
  })
  @MaxLength(25, { message: "Некорректный формат номера телефона" })
  @MinLength(8, { message: "Телефон должно содержать минимум 8 символов" })
  @IsNotEmpty({ message: "Введите номер телефона" })
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: "Максимум 20 символов" })
  @MinLength(3, { message: "Роль должно содержать минимум 3 символа" })
  role: UserRole;

  @IsString()
  @IsOptional()
  refresh: string;
}
