import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { Payment } from "./entities/payment.entity";
import { ResponseData, responseData } from "src/helpers/response";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { RefundPaymentDto } from "./dto/refund-payment.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("order/:order_id")
  async findByOrder(@Param("order_id") order_id: string): Promise<ResponseData<Payment | null>> {
    try {
      const payment = await this.paymentsService.findByOrder(Number(order_id));

      return responseData(payment, "success", [], "Оплата заказа получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Post("refund")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async refund(
    @Param("order_id") order_id: string,
    @Body() payload: RefundPaymentDto,
  ): Promise<ResponseData<Payment | null>> {
    try {
      const refundResponse = await this.paymentsService.refund(Number(order_id), payload.amount);

      return responseData(
        null,
        "success",
        [],
        refundResponse.result === "SUCCESS"
          ? "Возврат денег прошел успешно"
          : refundResponse.message,
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("test-create-payment")
  async testCreate(@Param("order_id") order_id: string): Promise<ResponseData<Payment | null>> {
    try {
      const payment = await this.paymentsService.createPaymentFromOrder(
        Number(order_id),
        500,
        "1234321",
      );

      return responseData(payment, "success", [], "Оплата заказа получена");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
