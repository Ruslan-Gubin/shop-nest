import { PartialType } from "@nestjs/mapped-types";
import { CreatePriceTypeDto } from "./create-price-type.dto";

export class UpdatePriceTypeDto extends PartialType(CreatePriceTypeDto) {}