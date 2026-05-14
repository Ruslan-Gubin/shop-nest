import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateWarehouseDto {
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Название должно содержать минимум 2 символа" })
  @IsNotEmpty({ message: "Введите название" })
  name: string;

  @IsOptional()
  @IsString({ message: "Район должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  area: string;

  @IsOptional()
  @IsString({ message: "Город должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  city: string;

  @IsOptional()
  @IsString({ message: "Улица должна быть строкой" })
  @MaxLength(200, { message: "Максимум 200 символов" })
  street: string;

  @IsOptional()
  @IsString({ message: "Дом должен быть строкой" })
  @MaxLength(50, { message: "Максимум 50 символов" })
  house: string;

  @IsOptional()
  @IsString({ message: "Почтовый индекс должен быть строкой" })
  @MaxLength(20, { message: "Максимум 20 символов" })
  index: string;

  @IsOptional()
  @IsString({ message: "Офис/квартира должен быть строкой" })
  @MaxLength(50, { message: "Максимум 50 символов" })
  office: string;

  @IsOptional()
  @IsInt({ message: "ID пользователя должно быть числом" })
  @Min(0, { message: "Не может быть отрицательным" })
  create_user_id: number;

  @IsOptional()
  @IsString({ message: "Описание должно быть строкой" })
  @MaxLength(1000, { message: "Максимум 1000 символов" })
  description: string;

  @IsOptional()
  @IsBoolean({ message: "Активен должен быть булевым" })
  is_active: boolean;

  @IsOptional()
  @IsBoolean({ message: "Склад по умолчанию должен быть булевым" })
  default_warehouse: boolean;

  @IsOptional()
  @IsBoolean({ message: "Публичный должен быть булевым" })
  is_public: boolean;
}