import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateOrderDto {
  @IsOptional()
  @IsInt({ message: "ID пользователя должно быть числом" })
  @Min(1, { message: "ID пользователя должен быть положительным" })
  create_user_id: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: "Максимум 1000 символов" })
  comment: string;
}

