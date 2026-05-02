import { IsInt, Max, Min } from "class-validator";

export class UpdatePriceFillDto {
  @IsInt({ message: "Процент наценки должен быть целым числом" })
  @Min(0, { message: "Процент наценки не может быть меньше 0" })
  @Max(1000, { message: "Процент наценки не может быть больше 1000" })
  percent: number;
}
