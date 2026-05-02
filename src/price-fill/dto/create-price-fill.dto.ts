import { IsInt, IsNotEmpty, Max, Min } from "class-validator";

export class CreatePriceFillDto {
  @IsInt({ message: "ID типа цены должен быть числом" })
  @IsNotEmpty({ message: "Выберите тип цены" })
  price_type_id: number;

  @IsInt({ message: "ID диапазона должен быть числом" })
  @IsNotEmpty({ message: "Выберите диапазон" })
  price_range_id: number;

  @IsInt({ message: "Процент наценки должен быть целым числом" })
  @Min(0, { message: "Процент наценки не может быть меньше 0" })
  @Max(1000, { message: "Процент наценки не может быть больше 1000" })
  percent: number;
}