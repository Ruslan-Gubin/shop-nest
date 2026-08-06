import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class SuggestCategoryDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите название товара" })
  @MinLength(3, { message: "Укажите название товара минимум 3 символа" })
  name: string;

  @IsString()
  @IsNotEmpty({ message: "Укажите описание товара" })
  @MinLength(3, { message: "Укажите описание товара минимум 3 символа" })
  description: string;
}
