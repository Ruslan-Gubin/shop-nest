import { IsInt, IsOptional, IsString } from "class-validator";

export class CheckImportItemDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  barcode: string;

  @IsOptional()
  @IsString()
  price?: string;
}
