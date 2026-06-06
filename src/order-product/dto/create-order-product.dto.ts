import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateOrderProductDto {
  @IsInt({ message: "ID заказа должен быть числом" })
  @IsNotEmpty({ message: "Выберите заказ" })
  order_id: number;

  @IsString({ message: "Название товара должно быть строкой" })
  @IsNotEmpty({ message: "Введите название товара" })
  product_name: string;

  @IsString({ message: "Код товара должен быть строкой" })
  product_code: string;

  @IsString({ message: "Описание товара должно быть строкой" })
  product_description: string;

  @IsString({ message: "Изображение товара должно быть строкой" })
  product_image: string;

  @IsString({ message: "Страна должна быть строкой" })
  product_country: string;

  @IsString({ message: "Тип товара должен быть строкой" })
  product_type: string;

  @IsString({ message: "Комплектация должна быть строкой" })
  product_equipment: string;

  @IsInt({ message: "Вес должен быть числом" })
  product_weight: number | null;

  @IsInt({ message: "Высота должна быть числом" })
  product_height: number | null;

  @IsInt({ message: "Длина должна быть числом" })
  product_length: number | null;

  @IsInt({ message: "Ширина должна быть числом" })
  product_width: number | null;

  @IsInt({ message: "Количество должно быть целым числом" })
  @Min(1, { message: "Количество не может быть меньше 1" })
  quantity: number;

  @IsInt({ message: "Цена должна быть целым числом" })
  @Min(0, { message: "Цена не может быть меньше 0" })
  price: number;
}