import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateProductSpecificationDto {
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @IsNotEmpty({ message: "Введите значение характеристики" })
  value: string;
}

