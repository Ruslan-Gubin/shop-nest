import { IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdatePhotoDto {
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\//i, { message: "URL должен начинаться с http:// или https://" })
  url: string;

  @IsOptional()
  @Min(1, { message: "Позиция не может быть меньше 1" })
  @IsInt({ message: "Позиция должна быть числом" })
  position: number;
}
