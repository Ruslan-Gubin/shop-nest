import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkFailedDto {
  /** код ошибки: no_balance | invalid_number | gateway | ... */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Максимум 50 символов' })
  error_code?: string;
}
