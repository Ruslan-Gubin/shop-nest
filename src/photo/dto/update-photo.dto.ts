import { IsInt, IsOptional, Min } from "class-validator";

export class UpdatePhotoDto {
  @IsOptional()
  @Min(1, { message: "Позиция не может быть меньше 1" })
  @IsInt({ message: "Позиция должна быть числом" })
  position: number;
}
