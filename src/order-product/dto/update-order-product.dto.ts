import { IsInt, Min } from "class-validator";

export class UpdateOrderProductDto {
  @IsInt({ message: "Количество должно быть целым числом" })
  @Min(1, { message: "Количество не может быть меньше 1" })
  quantity: number;

  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price: number;
}