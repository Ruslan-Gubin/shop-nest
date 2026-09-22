import { IsNotEmpty, IsString, Matches } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{11}$/, {
    message: "Некорректный формат номера телефона",
  })
  @IsNotEmpty({ message: "Введите номер телефона" })
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: "Код должен содержать 6 цифр" })
  @IsNotEmpty({ message: "Введите код" })
  code: string;
}
