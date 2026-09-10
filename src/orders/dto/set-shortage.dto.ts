import { Type } from "class-transformer";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, Min, ValidateNested } from "class-validator";

export class SetShortageItemDto {
  @IsInt({ message: "ID товара заказа должен быть числом" })
  @Min(1, { message: "ID товара заказа должен быть положительным" })
  id: number;

  @IsInt({ message: "Количество должно быть числом" })
  @Min(0, { message: "Количество не может быть отрицательным" })
  quantity: number;
}

export class SetShortageDto {
  @IsArray({ message: "Должен быть массив" })
  @ArrayNotEmpty({ message: "Массив не может быть пустым" })
  @ArrayUnique((item: SetShortageItemDto) => item.id, {
    message: "Дубли ID товара заказа запрещены",
  })
  @ValidateNested({ each: true })
  @Type(() => SetShortageItemDto)
  items: SetShortageItemDto[];
}

