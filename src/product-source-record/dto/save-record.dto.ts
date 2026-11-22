import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

class SpecificationItem {
  @IsString({ message: "Название характеристики должна быть строкой" })
  @MinLength(3, { message: "Минимум 3 символов" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  name: string;

  @IsString({ message: "Значение характеристики должна быть строкой" })
  @MinLength(3, { message: "Минимум 3 символов" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  value: string;
}

class CreateCategoriesItem {
  @IsString({ message: "Название категории должна быть строкой" })
  @MinLength(3, { message: "Минимум 3 символов для категории" })
  @MaxLength(255, { message: "Максимум 255 символов для категории" })
  name: string;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  parent_id: number | null;
}

export class RecordCategories {
  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  category_id: number | null;

  @IsNotEmpty({ message: "Создаваемые категории обязательны быть массивом" })
  @IsArray({ message: "Создаваемые категории должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => CreateCategoriesItem)
  create_categories: CreateCategoriesItem[];
}

export class SaveGeneratedRecordDto {
  @IsString()
  @IsNotEmpty({ message: "Укажите ключ по которому сохранится запись" })
  value: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  @IsNotEmpty({ message: "Укажите штрих-код" })
  @Matches(/^\d{8,14}$/, { message: "Некорректный штрих-код" })
  code: string;

  @IsString()
  product_type: string;

  @IsString()
  brand_name: string;

  @IsString()
  country: string;

  @IsString()
  equipment: string;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  price: number | null;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  weight: number | null;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  height: number | null;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  length: number | null;

  @ValidateIf((value) => typeof value === "number")
  @IsInt()
  width: number | null;

  @IsString()
  seo_title: string;

  @IsString()
  seo_description: string;

  @IsString()
  slug: string;

  @IsString()
  og_title: string;

  @IsString()
  og_description: string;
  @IsString()
  og_type: string;

  @IsString()
  keywords: string;

  @IsArray({ message: "Характеристики должны быть массивом" })
  @ValidateNested({ each: true })
  @Type(() => SpecificationItem)
  specifications: SpecificationItem[];

  @IsObject()
  @Type(() => RecordCategories)
  categories: RecordCategories;
}
