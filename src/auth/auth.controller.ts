import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Tokens } from './types/tokens.type';
import { SignInDto } from './dto/sign-in.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { responseData, ResponseData } from 'src/helpers/response';
import { CurrentStrategyUser } from './types/current-user';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private usersService: UsersService,
  ) { }

  @Public()
  @Post('/sign-up')
  @HttpCode(HttpStatus.OK)
  async signUp(@Body() createUserDto: CreateUserDto): Promise<ResponseData<Tokens | null>> {

    const findUserByEmail = await this.usersService.findByEmail(createUserDto.email);

    if (findUserByEmail) {
      return responseData(null, 'error', [{ key: "email", message: "Эта почта уже зарегистрирована" }], "");
    }

    try {
      const tokens = await this.authService.signUp(createUserDto);

      return responseData(tokens, 'success', [], 'Пользователь успешно создан');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Public()
  @Post('/sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() data: SignInDto): Promise<ResponseData<Tokens | null>> {
    try {
      const tokens = await this.authService.signIn(data);

      return responseData(tokens, 'success', [], 'Пользователь получен');
    } catch (error) {
      if (error === "Неверный адрес электронной почты или пароль") {
        return responseData(null, 'error', [{ key: 'email', message: error }]);
      } else {
        return responseData(null, 'error', [], error);
      }
    }
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentStrategyUser): Promise<ResponseData<null>> {
    try {
      await this.authService.logout(user.sub);

      return responseData(null, 'success', [], 'Пользователь вышел');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser() user: CurrentStrategyUser): Promise<ResponseData<Tokens | null>> {

    try {
      const tokens = await this.authService.refreshToken(user.sub, user.refresh)

      return responseData(tokens, 'success', [], 'Токены обновлены');
    } catch (error) {
      return responseData(null, 'error', [], error);
    }
  }
}
