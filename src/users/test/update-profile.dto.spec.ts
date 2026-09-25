import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignInDto } from '../../auth/dto/sign-in.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateUserDto } from '../dto/update-user-dto';

describe('UpdateProfileDto', () => {
  it('нормализует имя и email', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      name: '  Иван Петров  ',
      email: '  USER@EXAMPLE.COM  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Иван Петров');
    expect(dto.email).toBe('user@example.com');
  });

  it('отклоняет слишком короткое имя', async () => {
    const dto = plainToInstance(UpdateProfileDto, { name: 'Ив' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
  });

  it('отклоняет некорректный email', async () => {
    const dto = plainToInstance(UpdateProfileDto, { email: 'not-an-email' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'email' })]),
    );
  });

  it('разрешает изменение только одного поля', async () => {
    const nameDto = plainToInstance(UpdateProfileDto, { name: 'Петр Иванов' });
    const emailDto = plainToInstance(UpdateProfileDto, {
      email: 'petr@example.com',
    });

    expect(await validate(nameDto)).toHaveLength(0);
    expect(await validate(emailDto)).toHaveLength(0);
  });

  it('нормализует email при входе', async () => {
    const dto = plainToInstance(SignInDto, {
      email: '  USER@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('нормализует email при регистрации через наследование DTO', () => {
    const dto = plainToInstance(CreateUserDto, {
      email: '  REGISTERED@EXAMPLE.COM  ',
    });

    expect(dto.email).toBe('registered@example.com');
  });

  it('нормализует email при обновлении пользователя', () => {
    const dto = plainToInstance(UpdateUserDto, {
      email: '  UPDATED@EXAMPLE.COM  ',
    });

    expect(dto.email).toBe('updated@example.com');
  });
});
