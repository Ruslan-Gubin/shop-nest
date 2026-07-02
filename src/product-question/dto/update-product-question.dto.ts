import { IsString, MinLength, MaxLength } from "class-validator";

export class UpdateProductQuestionDto {
  @IsString({ message: "Ответ должен быть строкой" })
  @MinLength(10, { message: "Ответ должен содержать минимум 10 символов" })
  @MaxLength(1000, { message: "Ответ не может превышать 1000 символов" })
  answer: string;
}
