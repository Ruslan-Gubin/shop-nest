import { IsString, IsNotEmpty } from "class-validator";

export class PickImagesDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}