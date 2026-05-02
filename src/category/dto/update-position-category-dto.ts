import { IsInt, Min } from "class-validator";

export class UpdatePositionCategoryDto {
  parent_id: number;

  @Min(1, { message: "Позиция не может быть отрицательным" })
  @IsInt({ message: "Позиция должна быть числом" })
  position: number;
}
