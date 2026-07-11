import { IsArray, IsInt, ValidateNested, ArrayMinSize } from "class-validator";
import { Type } from "class-transformer";
import { ReservationItemDto } from "src/order-product/dto/create-order-product.dto";
import { CreateTransferDto } from "src/transfers/dto/create-transfer.dto";

export class ShipReservationItemDto {
  @IsInt({ message: "ID товара заказа должно быть числом" })
  id: number;

  @IsArray({ message: "Резервации должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations: ReservationItemDto[];
}

export class ShipOrderDto {
  @IsArray({ message: "Перемещения должны быть массивом" })
  @ArrayMinSize(1, { message: "Должно быть хотя бы одно перемещение" })
  @ValidateNested({ each: true })
  @Type(() => CreateTransferDto)
  transfers: CreateTransferDto[];

  @IsArray({ message: "Резервации должны быть массивом" })
  @ArrayMinSize(1, { message: "Должна быть хотя бы одна резервация" })
  @ValidateNested({ each: true })
  @Type(() => ShipReservationItemDto)
  reservations: ShipReservationItemDto[];
}
