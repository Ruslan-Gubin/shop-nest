import { IsNumber, Min } from "class-validator";

export class CreatePriceRangeDto {
  @IsNumber({}, { message: "Цена 'от' должна быть числом" })
  @Min(0, { message: "Цена 'от' не может быть отрицательной" })
  price_from: number;

  @IsNumber({}, { message: "Цена 'до' должна быть числом" })
  @Min(0, { message: "Цена 'до' не может быть отрицательной" })
  price_to: number;
}
