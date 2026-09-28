import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateSectorDto {
  @IsOptional()
  @IsInt({ message: 'ID сектора должно быть числом' })
  @Min(0, { message: 'ID сектора не может быть отрицательным' })
  id?: number;

  @IsString({ message: 'Цвет должен быть строкой' })
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Цвет должен быть в формате #FFFFFF',
  })
  color: string;

  @IsInt({ message: 'Цена доставки должна быть числом' })
  @Min(0, { message: 'Цена доставки не может быть отрицательной' })
  price: number;

  @IsInt({ message: 'Минимальная сумма заказа должна быть числом' })
  @Min(0, { message: 'Минимальная сумма заказа не может быть отрицательной' })
  min_sum: number;

  @IsArray({ message: 'Координаты должны быть массивом' })
  @ArrayMinSize(3, { message: 'Минимум 3 точки для полигона' })
  @ArrayMaxSize(5000, { message: 'Максимум 5000 точек' })
  coordinates: number[][];
}
