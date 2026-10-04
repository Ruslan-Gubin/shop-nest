import { IsInt, Min } from "class-validator";

export class RefundPaymentDto {
  @IsInt({ message: "Сумма должна быть числом" })
  @Min(1, { message: "Сумма должна быть положительным" })
  amount: number;
}
