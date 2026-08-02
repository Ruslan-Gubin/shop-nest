import { IsInt, IsNotEmpty, IsString, Matches } from "class-validator";

export class CreatePhotoDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите URL изображения" })
  @Matches(/^https?:\/\//i, { message: "URL должен начинаться с http:// или https://" })
  url: string;

  @IsString()
  @IsNotEmpty({ message: "Укажите тип родительской сущности" })
  parent_type: string;

  @IsInt({ message: "ID родительской сущности должен быть числом" })
  @IsNotEmpty({ message: "Укажите ID родительской сущности" })
  parent_id: number;
}
