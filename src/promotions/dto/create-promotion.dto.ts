import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreatePromotionDto {
  @IsString()
  @MaxLength(100, { message: "Максимум 100 символов" })
  @IsNotEmpty({ message: "Введите название акции" })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Максимум 500 символов" })
  description: string;

  @IsInt({ message: "Процент скидки должен быть целым числом" })
  @Min(1, { message: "Процент скидки не может быть меньше 1" })
  @Max(100, { message: "Процент скидки не может быть больше 100" })
  percent: number;

  @IsDateString({}, { message: "Введите корректную дату начала" })
  date_from: string;

  @IsDateString({}, { message: "Введите корректную дату окончания" })
  date_to: string;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  created_user_id: number;
}