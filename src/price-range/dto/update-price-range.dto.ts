import { PartialType } from "@nestjs/mapped-types";
import { CreatePriceRangeDto } from "./create-price-range.dto";

export class UpdatePriceRangeDto extends PartialType(CreatePriceRangeDto) {}