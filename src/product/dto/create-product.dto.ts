import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Название должно содержать минимум 2 символа" })
  @IsNotEmpty({ message: "Введите название" })
  name: string;

  @IsString({ message: "Штрих код должен быть строкой" })
  @ValidateIf((payload) => payload.code !== "")
  @Matches(/^\d+$/, { message: "Только цифры" })
  @MaxLength(14, { message: "Максимум 14 символов" })
  @MinLength(8, { message: "Минимум 8 символов" })
  code: string;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Категория ID должна быть числом" })
  category_id: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsString({ message: "Бренд должен быть строкой" })
  @ValidateIf((o) => o.brand_name !== undefined && o.brand_name !== null && o.brand_name !== "")
  @MaxLength(100, { message: "Максимум 100 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  brand_name: string;

  @IsOptional()
  @IsString({ message: "Страна должна быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  country: string;

  @IsOptional()
  @IsString({ message: "Вид товара должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  product_type: string;

  @IsOptional()
  @IsString({ message: "Состав товара должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
  equipment: string;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Вес должен быть числом" })
  weight: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Высота должна быть числом" })
  height: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Длина должна быть числом" })
  length: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Ширина должна быть числом" })
  width: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Закупочная цена должна быть числом" })
  purchase_price: number;

  @IsOptional()
  @IsString({ message: "SEO заголовок должен быть строкой" })
  @ValidateIf((o) => o.seo_title !== undefined && o.seo_title !== null && o.seo_title !== "")
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  seo_title: string;

  @IsOptional()
  @IsString({ message: "SEO описание должно быть строкой" })
  @ValidateIf(
    (o) =>
      o.seo_description !== undefined && o.seo_description !== null && o.seo_description !== "",
  )
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  seo_description: string;

  @IsOptional()
  @IsString({ message: "Slug должен быть строкой" })
  @ValidateIf((o) => o.slug !== undefined && o.slug !== null && o.slug !== "")
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  slug: string;

  @IsOptional()
  @IsString({ message: "OG заголовок должен быть строкой" })
  @ValidateIf((o) => o.og_title !== undefined && o.og_title !== null && o.og_title !== "")
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  og_title: string;

  @IsOptional()
  @IsString({ message: "OG описание должно быть строкой" })
  @ValidateIf(
    (o) => o.og_description !== undefined && o.og_description !== null && o.og_description !== "",
  )
  @MaxLength(255, { message: "Максимум 255 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  og_description: string;

  @IsOptional()
  @IsString({ message: "OG тип должен быть строкой" })
  @ValidateIf((o) => o.og_type !== undefined && o.og_type !== null && o.og_type !== "")
  @MaxLength(50, { message: "Максимум 50 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  og_type: string;

  @IsOptional()
  @IsString({ message: "Ключевые слова должны быть строкой" })
  @ValidateIf((o) => o.keywords !== undefined && o.keywords !== null && o.keywords !== "")
  @MaxLength(500, { message: "Максимум 500 символов" })
  @MinLength(2, { message: "Минимум 2 символа" })
  keywords: string;
}
