import { Type } from "class-transformer";
import { IsNotEmpty, IsString, Min } from "class-validator";

export class PhotoUploadDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите тип родительской сущности" })
  parent_type: string;

  @Type(() => Number)
  @IsNotEmpty({ message: "Укажите ID родительской сущности (в виде строки)" })
  @Min(1, { message: "ID родительской сущности должен быть числом" })
  parent_id: number;

  @Type(() => Number)
  @IsNotEmpty({ message: "Укажите позицию (в виде строки)" })
  @Min(1, { message: "Позиция не может быть меньше 1" })
  position: number;
}
