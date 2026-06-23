import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class CreateProductStockDto {
  @IsInt({ message: "ID склада должно быть числом" })
  @Min(1, { message: "ID склада должно быть положительным" })
  warehouse_id: number;

  @IsInt({ message: "ID товара должно быть числом" })
  @Min(1, { message: "ID товара должно быть положительным" })
  product_id: number;

  @IsOptional()
  @IsInt({ message: "Количество должно быть числом" })
  @Min(0, { message: "Количество не может быть отрицательным" })
  quantity?: number;

  @IsOptional()
  @IsBoolean({ message: "В наличии должно быть булевым" })
  in_stock?: boolean;
}
