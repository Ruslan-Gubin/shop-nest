import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class SetShortageItemDto {
  @IsInt({ message: 'ID товара заказа должен быть числом' })
  @Min(1, { message: 'ID товара заказа должен быть положительным' })
  id: number;

  @IsInt({ message: 'Количество должно быть числом' })
  @Min(0, { message: 'Количество не может быть отрицательным' })
  quantity: number;

  @IsInt({ message: 'ID склада должен быть числом' })
  @Min(1, { message: 'ID склада должен быть положительным' })
  warehouse_id: number;

  @IsOptional()
  @IsInt({ message: 'ID остатка должен быть числом' })
  @Min(1, { message: 'ID остатка должен быть положительным' })
  stock_id: number;
}

export class SetShortageDto {
  @IsArray({ message: 'Должен быть массив' })
  @ArrayNotEmpty({ message: 'Массив не может быть пустым' })
  @ArrayUnique((item: SetShortageItemDto) => item.stock_id, {
    message: 'Дубли остатков запрещены',
  })
  @ValidateNested({ each: true })
  @Type(() => SetShortageItemDto)
  items: SetShortageItemDto[];
}
