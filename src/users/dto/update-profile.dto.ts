import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

type TransformValue = { value: unknown };

export class UpdateProfileDto {
  @IsString()
  @MinLength(3, { message: "Имя должно содержать минимум 3 символа" })
  @MaxLength(50, { message: "Максимум 50 символов" })
  @Transform(({ value }: TransformValue): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  name: string;

  @IsString()
  @IsEmail({}, { message: "Некорректный формат почты" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  @Transform(({ value }: TransformValue): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email: string;
}
