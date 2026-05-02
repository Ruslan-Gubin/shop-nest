import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(2, { message: "Название должно содержать минимум 2 символа" })
  @IsNotEmpty({ message: "Введите название" })
  name: string;

  @Min(0, { message: "Не может быть отрицательным" })
  @IsNotEmpty({ message: "Количество обязательно" })
  @IsInt({ message: "Количество должно быть числом" })
  count: number;

  @Min(0, { message: "Не может быть отрицательным" })
  @IsNotEmpty({ message: "Цена обязательна" })
  @IsInt({ message: "Цена должна быть числом" })
  price: number;

  @IsString({ message: "Штрих код должен быть строкой" })
  @Matches(/^\d+$/, { message: "Только цифры" })
  @MaxLength(14, { message: "Максимум 14 символов" })
  @MinLength(8, { message: "Минимум 8 символов" })
  @IsNotEmpty({ message: "Штрихкод обязателен" })
  code: string;
}
