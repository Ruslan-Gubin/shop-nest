import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCartDiscountDto {
  @IsString()
  @MaxLength(100, { message: "Максимум 100 символов" })
  @IsNotEmpty({ message: "Введите название скидки" })
  name: string;

  @IsOptional()
  @IsInt({ message: "Минимальная сумма должна быть целым числом" })
  @Min(0, { message: "Минимальная сумма не может быть меньше 0" })
  min_sum: number;

  @IsOptional()
  @IsInt({ message: "Процент скидки должен быть целым числом" })
  @Min(1, { message: "Процент скидки не может быть меньше 1" })
  @Max(100, { message: "Процент скидки не может быть больше 100" })
  percent: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "Максимум 50 символов" })
  apply_to: string;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  created_user_id: number;
}

