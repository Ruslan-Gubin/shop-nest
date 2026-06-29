import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAddressDto {
  @IsOptional()
  @IsEnum(["pickup", "courier"], {
    message: "Тип адреса должен быть pickup или courier",
  })
  type: "pickup" | "courier";

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  place: string;

  @IsNumber({}, { message: "Долгота должна быть числом" })
  lng: number;

  @IsNumber({}, { message: "Широта должна быть числом" })
  lat: number;

  @IsOptional()
  @IsString()
  entrance: string;

  @IsOptional()
  @IsString()
  flat: string;

  @IsOptional()
  @IsString()
  floor: string;

  @IsOptional()
  @IsString()
  intercom: string;
}
