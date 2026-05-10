import { IsInt, Min } from "class-validator";

export class UpdateProductPriceDto {
  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price: number;
}
