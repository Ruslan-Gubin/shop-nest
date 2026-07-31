import { IsString, IsNotEmpty } from "class-validator";

export class SearchProductSourceRecordDto {
  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}
