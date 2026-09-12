import { IsArray, IsInt, IsOptional, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ReservationItemDto } from "./create-order-product.dto";

export class ShortageItemDto {
  @IsInt({ message: "ID остатка должен быть числом" })
  @Min(1, { message: "ID остатка должен быть положительным" })
  stock_id: number;

  @IsInt({ message: "ID склада должен быть числом" })
  @Min(1, { message: "ID склада должен быть положительным" })
  warehouse_id: number;

  @IsInt({ message: "Количество должно быть числом" })
  @Min(0, { message: "Количество не может быть отрицательным" })
  quantity: number;
}

export class UpdateOrderProductDto {
  @IsOptional()
  @IsInt({ message: "Количество должно быть целым числом" })
  @Min(1, { message: "Количество не может быть меньше 1" })
  quantity?: number;

  @IsOptional()
  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price?: number;

  @IsArray({ message: "Резервации должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations?: ReservationItemDto[];

  @IsOptional()
  @IsArray({ message: "Трансферы должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  transfers?: ReservationItemDto[];

  @IsOptional()
  @IsArray({ message: "Дефицит должен быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ShortageItemDto)
  shortage_stocks?: ShortageItemDto[];
}
