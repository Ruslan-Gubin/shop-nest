import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class UpdateProductStockDto {
  @IsOptional()
  @IsInt({ message: "Количество должно быть числом" })
  @Min(0, { message: "Количество не может быть отрицательным" })
  quantity?: number;

  @IsOptional()
  @IsInt({ message: "Зарезервированное количество должно быть числом" })
  @Min(0, { message: "Зарезервированное количество не может быть отрицательным" })
  reserved?: number;

  @IsOptional()
  @IsBoolean({ message: "В наличии должно быть булевым" })
  in_stock?: boolean;
}

