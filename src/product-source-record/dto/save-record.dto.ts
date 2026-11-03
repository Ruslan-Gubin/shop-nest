import { IsNotEmpty, IsObject, IsString, Matches } from 'class-validator';

export class SaveGeneratedRecordDto {
  @IsString()
  @IsNotEmpty({ message: 'Укажите штрих-код' })
  @Matches(/^\d{8,14}$/, { message: 'Некорректный штрих-код' })
  barcode: string;

  @IsString()
  clear_name: string;

  @IsObject({ message: 'Данные товара должны быть объектом' })
  product: object;
}
