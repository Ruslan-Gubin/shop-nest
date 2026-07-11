import { IsArray, IsInt, IsOptional, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ReservationItemDto } from "./create-order-product.dto";

export class UpdateOrderProductDto {
  @IsOptional()
  @IsInt({ message: "Количество должно быть целым числом" })
  @Min(1, { message: "Количество не может быть меньше 1" })
  quantity?: number;

  @IsOptional()
  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price?: number;

  @IsOptional()
  @IsArray({ message: "Резервации должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations?: ReservationItemDto[] | null;
}