import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
  @IsBoolean({ message: "Доступ к веб приложению должен быть булевым" })
  is_public: boolean;

  @IsOptional()
  @IsString()
  address_name: string;

  @IsOptional()
  @IsString()
  place: string;

  @IsNumber({}, { message: "Долгота должна быть числом" })
  lng: number;

  @IsNumber({}, { message: "Широта должна быть числом" })
  lat: number;

  @IsOptional()
  @IsString()
  entrance: string;

  @IsOptional()
  @IsString()
  flat: string;

  @IsOptional()
  @IsString()
  floor: string;

  @IsOptional()
  @IsString()
  intercom: string;
}
