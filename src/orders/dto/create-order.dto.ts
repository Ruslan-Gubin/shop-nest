import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CreateAddressDto } from "src/address/dto/create-address.dto";
import { OrderProductDto } from "src/order-product/dto/create-order-product.dto";
import { USER_ROLES } from "src/auth/constants/roles.const";

export class CreateOrderDto {
  @IsOptional()
  @IsInt({ message: "ID пользователя должно быть числом" })
  @Min(1, { message: "ID пользователя должен быть положительным" })
  create_user_id: number;

  @IsOptional()
  @IsString({ message: "Роль пользователя должна быть строкой" })
  @IsIn(USER_ROLES, {
    message: "Некорректная роль пользователя",
  })
  user_role: string;

  @ValidateIf((o) => typeof o.phone === "string" && o.phone.length > 0)
  @IsString({ message: "Телефон должен быть строкой" })
  @MinLength(10, {
    message: "Телефон получателя должен состоять минимум из 10 символов",
  })
  @Matches(/^(\+?\d{1,3})?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10,15}$/, {
    message: "Некорректный формат номера телефона",
  })
  phone: string;

  @IsString()
  phoneCode: string;

  @ValidateIf((o) => typeof o.recipient_name === "string" && o.recipient_name.length > 0)
  @IsString({ message: "Имя получателя должно быть строкой" })
  @MinLength(3, {
    message: "Имя получателя должно содержать минимум 3 символа",
  })
  @MaxLength(50, { message: "Максимум 50 символов" })
  recipient_name: string;

  @ValidateIf((o) => typeof o.comment === "string" && o.comment.length > 0)
  @IsString({ message: "Комментарий должен быть строкой" })
  @MaxLength(1000, {
    message: "Комментарий должен содержать максимум 1000 символов",
  })
  comment: string;

  @IsEnum(["cash", "card"], {
    message: "Способ оплаты должен быть или наличными или банковской картой",
  })
  payment_method: "cash" | "card";

  @IsEnum(["pickup", "courier"], {
    message: "Способ получения должен быть самовывозом или доставкой",
  })
  method_receipt: "pickup" | "courier";

  @IsDateString(undefined, { message: "Дата доставки от должна быть корректной датой" })
  date_from: string;

  @IsDateString(undefined, { message: "Дата доставки до должна быть корректной датой" })
  date_to: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto | null;

  @IsArray({ message: "Товары должны быть массивом" })
  @ArrayMinSize(1, { message: "Должен быть хотя бы один товар" })
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];
}
