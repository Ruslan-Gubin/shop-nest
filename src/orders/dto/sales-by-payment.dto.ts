import { IsOptional, IsDateString } from "class-validator";

export class SalesByPaymentDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
