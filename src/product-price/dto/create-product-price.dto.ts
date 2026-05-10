import { IsInt, IsNotEmpty, Min } from "class-validator";

export class CreateProductPriceDto {
  @IsInt({ message: "ID товара должен быть числом" })
  @IsNotEmpty({ message: "Выберите товар" })
  product_id: number;

  @IsInt({ message: "ID типа цены должен быть числом" })
  @IsNotEmpty({ message: "Выберите тип цены" })
  price_type_id: number;

  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price: number;
}
