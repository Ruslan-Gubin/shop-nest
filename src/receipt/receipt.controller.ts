import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReceiptService } from "./receipt.service";
import { CreateReceiptItemDto } from "./dto/create-receipt.dto";
import { ResponseData, responseData } from "src/helpers/response";
import { Receipt } from "./entities/receipt.entity";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { CurrentStrategyUser } from "src/auth/types/current-user";

@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post("create")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async create(
    @Body(new ParseArrayPipe({ items: CreateReceiptItemDto }))
    payload: CreateReceiptItemDto[],
    @CurrentUser() user: CurrentStrategyUser,
  ): Promise<ResponseData<Receipt | null>> {
    try {
      const receipt = await this.receiptService.create(payload, user.sub);
      return responseData(receipt, "success", [], "Поступление товара успешно оформлено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("name") name?: string,
  ): Promise<
    ResponseData<{
      receipts: Receipt[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const result = await this.receiptService.findAll(page, limit, name);
      return responseData(result, "success", [], "Список поступлений получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<
    ResponseData<{
      receipt: Receipt;
      productInfo: Record<number, string>;
    } | null>
  > {
    try {
      const result = await this.receiptService.findOne(Number(id));
      return responseData(result, "success", [], "Поступление получено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
