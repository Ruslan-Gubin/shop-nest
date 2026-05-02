import { PartialType } from "@nestjs/mapped-types";
import { CreateCartDiscountDto } from "./create-cart-discount.dto";

export class UpdateCartDiscountDto extends PartialType(CreateCartDiscountDto) {}