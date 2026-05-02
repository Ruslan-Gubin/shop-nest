import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePriceTypeDto {
  @IsString()
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(2, {
    message: "Название типа цены должно содержать минимум 2 символа",
  })
  @IsNotEmpty({ message: "Введите название типа цены" })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, {
    message: "Описание типа цены должно содержать минимум 2 символа",
  })
  description: string;

  @IsOptional()
  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  minQuantity: number;

  @IsOptional()
  created_user_id: number;
}
