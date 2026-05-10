import {
  IsInt,
  IsNotEmpty,
  IsOptional,
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

  @IsString({ message: "Штрих код должен быть строкой" })
  @Matches(/^\d+$/, { message: "Только цифры" })
  @MaxLength(14, { message: "Максимум 14 символов" })
  @MinLength(8, { message: "Минимум 8 символов" })
  @IsNotEmpty({ message: "Штрихкод обязателен" })
  code: string;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Бренд ID должно быть числом" })
  brand_id: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Категория ID должна быть числом" })
  category_id: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsString({ message: "Страна должна быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  country: string;

  @IsOptional()
  @IsString({ message: "Вид товара должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  product_type: string;

  @IsOptional()
  @IsString({ message: "Состав товара должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  equipment: string;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Вес должен быть числом" })
  weight: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Высота должна быть числом" })
  height: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Длина должна быть числом" })
  length: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Ширина должна быть числом" })
  width: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Закупочная цена должна быть числом" })
  purchase_price: number;
}
