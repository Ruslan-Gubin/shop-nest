import { Controller, Get, Post, Body, Patch, Param, Query, Delete } from "@nestjs/common";
import { TransfersService } from "./transfers.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { UpdateTransferDto } from "./dto/update-transfer.dto";
import { ResponseData, responseData } from "src/helpers/response";
import { Transfer } from "./entities/transfer.entity";

@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post("create")
  async create(
    @Body() createTransferDto: CreateTransferDto,
  ): Promise<ResponseData<Transfer | null>> {
    try {
      const transfer = await this.transfersService.create(createTransferDto);

      return responseData(transfer, "success", [], "Перемещение успешно создано");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Query("status") status?: "processing" | "completed" | "rejected",
  ): Promise<
    ResponseData<{
      transfers: Transfer[];
      totalCount: number;
      paginationPage: string;
    } | null>
  > {
    try {
      const [transfers, totalCount] = await this.transfersService.findAll(page, limit, status);

      return responseData(
        { transfers, totalCount, paginationPage: page },
        "success",
        [],
        "Список перемещений получен",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("transfer-order/:id")
  async findByOrderId(@Param("id") id: string): Promise<ResponseData<Transfer[] | null>> {
    try {
      const transfers = await this.transfersService.findByOrderId(Number(id));

      return responseData(transfers, "success", [], "Перемещения заказа получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("delivery-order/:id")
  async findDeliveryByOrderId(@Param("id") id: string): Promise<ResponseData<Transfer[] | null>> {
    try {
      const transfers = await this.transfersService.findDeliveryByOrderId(Number(id));

      return responseData(transfers, "success", [], "Перемещения доставки заказа получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("in-transit/active")
  async findAllInTransit(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<
    ResponseData<{
      transfers: Transfer[];
      totalCount: number;
      paginationPage: number;
    } | null>
  > {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const [transfers, totalCount] = await this.transfersService.findAllInTransit(
        pageNum,
        limitNum,
      );

      return responseData(
        { transfers, totalCount, paginationPage: pageNum },
        "success",
        [],
        "Перемещения в пути получены",
      );
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Transfer | null>> {
    try {
      const transfer = await this.transfersService.findOne(Number(id));

      return responseData(transfer, "success", [], "Перемещение получено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.transfersService.update(Number(id), updateTransferDto);

      return responseData(null, "success", [], "Перемещение успешно изменено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.transfersService.remove(Number(id));

      return responseData(null, "success", [], "Перемещение успешно удалено");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
