import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateProductReviewDto {
  @IsOptional()
  @IsString({ message: "Текст отзыва должен быть строкой" })
  @MinLength(1, { message: "Текст отзыва не может быть пустым" })
  text?: string;

  @IsOptional()
  @IsInt({ message: "Оценка должна быть числом" })
  @Min(0, { message: "Оценка не может быть меньше 0" })
  @Max(5, { message: "Оценка не может быть больше 5" })
  rating?: number;
}
