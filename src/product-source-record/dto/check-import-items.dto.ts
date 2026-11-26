import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CheckImportItemDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty({ message: "Укажите штрих-код" })
  @Matches(/^\d{8,14}$/, { message: "Некорректный штрих-код" })
  barcode: string;

  @IsOptional()
  @IsString()
  price?: string;
}
