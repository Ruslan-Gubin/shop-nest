import { PartialType } from "@nestjs/mapped-types";
import { CreateOrderDto } from "./create-order.dto";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { OrderStatus } from "../entities/order.entity";

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsIn(
    [
      "new",
      "cancelled_new",
      "processing",
      "cancelled_assembly",
      "ready",
      "in_delivery",
      "cancelled_delivery",
      "completed",
      "cancelled_customer",
    ],
    { message: "Недопустимый статус заказа" },
  )
  status: OrderStatus;

  @IsOptional()
  @IsString({ message: "Причина отказа должна быть строкой" })
  @MaxLength(500, { message: "Максимум 500 символов" })
  rejected_reason: string;
}