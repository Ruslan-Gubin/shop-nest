import { IsNotEmpty, IsNumber, IsString, MaxLength } from "class-validator";

export class CreateProductSpecificationDto {
  @IsNumber()
  @IsNotEmpty({ message: "Укажите ID товара" })
  product_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "Укажите ID характеристики" })
  specification_id: number;

  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @IsNotEmpty({ message: "Введите значение характеристики" })
  value: string;
}