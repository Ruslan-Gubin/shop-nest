import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateProductReviewDto {
  @IsInt({ message: "ID товара должно быть числом" })
  @Min(1, { message: "ID товара должно быть положительным" })
  product_id: number;

  @IsOptional()
  @IsInt({ message: "ID пользователя должно быть числом" })
  @Min(1, { message: "ID пользователя должно быть положительным" })
  create_user_id: number;

  @IsInt({ message: "Поставьте оценку" })
  @Min(1, { message: "Поставьте оценку" })
  @Max(5, { message: "Оценка от 1 до 5" })
  rating: number;

  @IsOptional()
  @IsString({ message: "Достоинства должны быть строкой" })
  @ValidateIf(
    (o) => o.dignities !== undefined && o.dignities !== null && o.dignities !== "",
  )
  @MinLength(10, { message: "Число символов от 10 до 1000" })
  @MaxLength(1000, { message: "Число символов от 10 до 1000" })
  dignities?: string;

  @IsOptional()
  @IsString({ message: "Недостатки должны быть строкой" })
  @ValidateIf(
    (o) =>
      o.disadvantages !== undefined &&
      o.disadvantages !== null &&
      o.disadvantages !== "",
  )
  @MinLength(10, { message: "Число символов от 10 до 1000" })
  @MaxLength(1000, { message: "Число символов от 10 до 1000" })
  disadvantages?: string;

  @IsOptional()
  @IsString({ message: "Комментарий должен быть строкой" })
  @ValidateIf(
    (o) => o.comment !== undefined && o.comment !== null && o.comment !== "",
  )
  @MinLength(10, { message: "Число символов от 10 до 1000" })
  @MaxLength(1000, { message: "Число символов от 10 до 1000" })
  comment?: string;
}
