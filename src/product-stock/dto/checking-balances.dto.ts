import { IsInt, Min } from "class-validator";

export class CheckingBalancesItemDto {
  @IsInt({ message: "ID товара должен быть числом" })
  product_id: number;

  @IsInt({ message: "Количество должно быть числом" })
  @Min(1, { message: "Количество не может быть меньше 1" })
  quantity: number;
}


