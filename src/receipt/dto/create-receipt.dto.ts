import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateReceiptItemDto {
  @IsOptional()
  @IsInt({ message: "ID товара должен быть числом" })
  productId?: number | null;

  @IsOptional()
  @IsString({ message: "Название товара должно быть строкой" })
  name?: string;

  @IsOptional()
  @IsString({ message: "Штрихкод должен быть строкой" })
  code?: string;

  @IsOptional()
  @IsInt({ message: "Закупочная цена должна быть числом" })
  @Min(0, { message: "Закупочная цена не может быть отрицательной" })
  purchasePrice?: number;

  @IsObject({ message: "Цены должны быть объектом" })
  priceValues: Record<string, number>;

  @IsObject({ message: "Остатки должны быть объектом" })
  stocks: Record<string, number>;
}
