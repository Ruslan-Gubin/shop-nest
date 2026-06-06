import { IsNumber, IsString, MaxLength, Min, MinLength } from "class-validator";

export class UpdateSearchDto {
  @IsString({ message: "Текст запроса должен быть строкой" })
  @MinLength(1, { message: "Текст запроса не может быть пустым" })
  @MaxLength(255, { message: "Текст запроса не может превышать 255 символов" })
  text: string;

  @IsNumber({}, { message: "Количество результатов должно быть числом" })
  @Min(0, { message: "Количество результатов не может быть отрицательным" })
  result_count: number;
}
