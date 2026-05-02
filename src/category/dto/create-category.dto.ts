import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCategoryDto {
  @IsOptional()
  @Min(0, { message: "Родительский id не может быть отрицательным" })
  @IsInt({ message: "Родительский id должен быть числом" })
  parent_id: number;

  @IsOptional()
  @Min(0, { message: "Позиция не может быть отрицательным" })
  @IsInt({ message: "Позиция должна быть числом" })
  position: number;

  @IsString()
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(2, {
    message: "Название категории должно содержать минимум 2 символа",
  })
  @IsNotEmpty({ message: "Введите название категории" })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, {
    message: "Описание категории должно содержать минимум 2 символа",
  })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, {
    message: "Описание категории должно содержать минимум 2 символа",
  })
  image: string;

  @IsOptional()
  created_user_id: number;
}
