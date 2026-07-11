import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export class CreateTransferDto {
  @IsEnum(["transfer", "delivery"], {
    message: "Тип перемещения должен быть transfer или delivery",
  })
  type: "transfer" | "delivery";

  @IsInt({ message: "ID заказа должно быть числом" })
  order_id: number;

  @IsInt({ message: "ID склада отправителя должно быть числом" })
  @Min(0, { message: "ID склада не может быть отрицательным" })
  from_warehouse_id: number;

  @IsOptional()
  @IsInt({ message: "ID склада получателя должно быть числом" })
  @Min(0, { message: "ID склада не может быть отрицательным" })
  to_warehouse_id: number;

  @IsOptional()
  @IsInt({ message: "ID адреса должно быть числом" })
  @Min(0, { message: "ID адреса не может быть отрицательным" })
  address_id: number;
}
