import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class GenerateAnswerProductReviewDto {
  @IsInt({ message: "ID отзыва должно быть числом" })
  @Min(1, { message: "ID отзыва должно быть положительным" })
  review_id: number;

  @IsOptional()
  @IsString({ message: "Контекст должен быть строкой" })
  @MaxLength(2000, { message: "Контекст не может превышать 2000 символов" })
  context?: string;
}
