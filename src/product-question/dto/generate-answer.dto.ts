import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
} from "class-validator";

export class GenerateAnswerDto {
  @IsInt({ message: "ID товара должно быть числом" })
  @Min(1, { message: "ID товара должно быть положительным" })
  product_id: number;

  @IsString({ message: "Вопрос должен быть строкой" })
  @MinLength(10, { message: "Вопрос должен содержать минимум 10 символов" })
  @MaxLength(1000, { message: "Вопрос не может превышать 1000 символов" })
  question: string;

  @IsOptional()
  @IsString({ message: "Контекст должен быть строкой" })
  @MaxLength(2000, { message: "Контекст не может превышать 2000 символов" })
  context?: string;
}
