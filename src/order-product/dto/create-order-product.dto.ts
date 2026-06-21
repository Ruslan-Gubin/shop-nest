import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ReservationItemDto {
  @IsInt({ message: "ID остатка должен быть числом" })
  stock_id: number;

  @IsInt({ message: "Количество должно быть числом" })
  @Min(1, { message: "Количество должно быть минимум 1" })
  quantity: number;
}

export class OrderProductDto {
  @IsInt({ message: "ID товара должно быть целым числом" })
  @Min(1, { message: "ID товара должен быть положительным" })
  product_id: number;

  @IsInt({ message: "Количество должно быть целым числом" })
  @Min(1, { message: "Количество должно быть минимум 1" })
  quantity: number;
}

export class CreateOrderProductDto {
  @IsInt({ message: "ID товара должно быть числом" })
  @IsNotEmpty({ message: "Необходимо ID товара" })
  product_id: number;

  @Min(0, { message: "ID Не может быть отрицательным" })
  @IsInt({ message: "ID заказа должно быть числом" })
  order_id: number;

  @IsString({ message: "Название товара должно быть строкой" })
  @IsNotEmpty({ message: "Необходимо название товара" })
  name: string;

  @IsString({ message: "Код товара должен быть строкой" })
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
  @Min(0, { message: "Значение не может быть отрицательным" })
  @IsInt({ message: "Вес должен быть числом" })
  weight: number;

  @IsOptional()
  @Min(0, { message: "Значение не может быть отрицательным" })
  @IsInt({ message: "Высота должна быть числом" })
  height: number;

  @IsOptional()
  @Min(0, { message: "Значение не может быть отрицательным" })
  @IsInt({ message: "Длина должна быть числом" })
  length: number;

  @IsOptional()
  @Min(0, { message: "Значение не может быть отрицательным" })
  @IsInt({ message: "Ширина должна быть числом" })
  width: number;

  @IsOptional()
  @Min(0, { message: "Закупочная цена не может быть отрицательной" })
  @IsInt({ message: "Закупочная цена должна быть числом" })
  purchase_price: number;

  @Min(0, { message: "Цена не может быть отрицательной" })
  @IsInt({ message: "Цена должна быть числом" })
  price: number;

  @Min(1, { message: "Количество не может быть отрицательной" })
  @IsInt({ message: "Количество должна быть числом" })
  quantity: number;

  @IsOptional()
  @IsArray({ message: "Резервации должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations?: ReservationItemDto[] | null;
}
