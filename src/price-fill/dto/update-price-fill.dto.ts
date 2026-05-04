import { IsInt, Min } from "class-validator";

export class UpdatePriceFillDto {
  @IsInt({ message: "Процент наценки должен быть целым числом" })
  @Min(0, { message: "Процент наценки не может быть меньше 0" })
  percent: number;
}
