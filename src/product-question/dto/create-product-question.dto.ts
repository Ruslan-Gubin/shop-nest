import { IsInt, Min, IsString, MinLength, MaxLength, IsOptional } from "class-validator";

export class CreateProductQuestionDto {
  @IsInt({ message: "ID товара должно быть числом" })
  @Min(1, { message: "ID товара должно быть положительным" })
  product_id: number;

  @IsOptional()
  @IsInt({ message: "ID пользователя должно быть числом" })
  @Min(1, { message: "ID пользователя должно быть положительным" })
  create_user_id?: number;

  @IsString({ message: "Вопрос должен быть строкой" })
  @MinLength(10, { message: "Вопрос должен содержать минимум 10 символов" })
  @MaxLength(1000, { message: "Вопрос не может превышать 1000 символов" })
  question: string;
}
