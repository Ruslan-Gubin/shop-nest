import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { AddressService } from "./address.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ResponseData, responseData } from "src/helpers/response";
import { Address } from "./entities/address.entity";

@Controller("addresses")
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post("create")
  async create(@Body() createAddressDto: CreateAddressDto): Promise<ResponseData<Address | null>> {
    try {
      const address = await this.addressService.create(createAddressDto);

      return responseData(address, "success", [], "Адрес успешно добавлен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get()
  async findAll(): Promise<ResponseData<Address[] | null>> {
    try {
      const addresses = await this.addressService.findAll();

      return responseData(addresses, "success", [], "Список адресов получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("order/:order_id")
  async findByOrder(@Param("order_id") order_id: string): Promise<ResponseData<Address[] | null>> {
    try {
      const addresses = await this.addressService.findByOrder(Number(order_id));

      return responseData(addresses, "success", [], "Адреса заказа получены");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get("warehouse/:warehouse_id")
  async findByWarehouse(
    @Param("warehouse_id") warehouse_id: string,
  ): Promise<ResponseData<Address[] | null>> {
    try {
      const addresses = await this.addressService.findByWarehouse(Number(warehouse_id));

      return responseData(addresses, "success", [], "Адрес склада получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ResponseData<Address | null>> {
    try {
      const address = await this.addressService.findOne(Number(id));

      return responseData(address, "success", [], "Адрес получен");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Patch(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<ResponseData<null>> {
    try {
      await this.addressService.update(Number(id), updateAddressDto);

      return responseData(null, "success", [], "Адрес успешно изменён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }

  @Delete(":id")
  @Roles("admin", "moderator")
  @UseGuards(RolesGuard)
  async remove(@Param("id") id: string): Promise<ResponseData<null>> {
    try {
      await this.addressService.remove(Number(id));

      return responseData(null, "success", [], "Адрес успешно удалён");
    } catch (error) {
      return responseData(null, "error", [], error);
    }
  }
}
