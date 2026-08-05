import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class GenerateSeoDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите название товара" })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  brand_name?: string;

  @IsString()
  @IsOptional()
  category_name?: string;

  @IsObject()
  @IsOptional()
  seo?: {
    seo_title?: string;
    seo_description?: string;
    slug?: string;
    og_title?: string;
    og_description?: string;
    og_type?: string;
    keywords?: string;
  };
}
