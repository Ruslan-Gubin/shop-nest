import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { SpecificationType } from "../entities/specification.entity";

export class CreateSpecificationDto {
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, {
    message: "Название характеристики должно содержать минимум 2 символа",
  })
  @IsNotEmpty({ message: "Введите название характеристики" })
  name: string;

  @IsEnum(["text", "color", "number"], {
    message: "Тип должен быть: text, color или number",
  })
  @IsNotEmpty({ message: "Выберите тип характеристики" })
  type: SpecificationType;

  @IsOptional()
  created_user_id: number;
}
