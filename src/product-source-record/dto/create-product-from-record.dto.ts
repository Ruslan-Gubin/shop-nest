import { IsNotEmpty, IsString, Matches } from "class-validator";

export class CreateProductFromRecordDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите штрих-код" })
  @Matches(/^\d{8,14}$/, { message: "Некорректный штрих-код" })
  barcode: string;
}
