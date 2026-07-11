import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RejectOrderDto {
  @IsNotEmpty({ message: "Причина отказа обязательна" })
  @IsString({ message: "Причина отказа должна быть строкой" })
  @MaxLength(500, { message: "Максимум 500 символов" })
  rejected_reason: string;
}
