import { IsNotEmpty, IsNumber, IsString, Matches, Min } from "class-validator";

export class CreateProductFromRecordDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите штрих-код" })
  @Matches(/^\d{8,14}$/, { message: "Некорректный штрих-код" })
  barcode: string;

  @IsNumber({}, { message: "Цена должна быть числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price: number;
}
