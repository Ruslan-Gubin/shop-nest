import { IsString, MaxLength, MinLength } from "class-validator";

export class AnswerProductReviewDto {
  @IsString({ message: "Ответ должен быть строкой" })
  @MinLength(1, { message: "Ответ не может быть пустым" })
  @MaxLength(1000, { message: "Максимальная длина ответа — 1000 символов" })
  answer: string;
}
