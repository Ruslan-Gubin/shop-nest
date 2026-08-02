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

  @ValidateIf((payload) => payload.code !== "")
  @IsString({ message: "Штрих код должен быть строкой" })
  @Matches(/^\d+$/, { message: "Только цифры" })
  @MaxLength(14, { message: "Максимум 14 символов" })
  @MinLength(8, { message: "Минимум 8 символов" })
  code: string;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Бренд ID должно быть числом" })
  brand_id: number;

  @IsOptional()
  @Min(0, { message: "Не может быть отрицательным" })
  @IsInt({ message: "Категория ID должна быть числом" })
  category_id: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsString({ message: "Бренд должен быть строкой" })
  @MaxLength(100, { message: "Максимум 100 символов" })
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
  @MaxLength(255, { message: "Максимум 255 символов" })
  seo_title: string;

  @IsOptional()
  @IsString({ message: "SEO описание должно быть строкой" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  seo_description: string;

  @IsOptional()
  @IsString({ message: "Slug должен быть строкой" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  slug: string;

  @IsOptional()
  @IsString({ message: "OG заголовок должен быть строкой" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  og_title: string;

  @IsOptional()
  @IsString({ message: "OG описание должно быть строкой" })
  @MaxLength(255, { message: "Максимум 255 символов" })
  og_description: string;

  @IsOptional()
  @IsString({ message: "OG тип должен быть строкой" })
  @MaxLength(50, { message: "Максимум 50 символов" })
  og_type: string;

  @IsOptional()
  @IsString({ message: "Ключевые слова должны быть строкой" })
  @MaxLength(500, { message: "Максимум 500 символов" })
  keywords: string;
}
