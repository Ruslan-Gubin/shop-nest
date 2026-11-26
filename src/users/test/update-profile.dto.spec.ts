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
    const dto = plainToInstance(UpdateProfileDto, {
      name: 'Ив',
      email: 'user@example.com',
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
  });

  it('отклоняет некорректный email', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      name: 'Иван Петров',
      email: 'not-an-email',
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'email' })]),
    );
  });

  it('разрешает пустые строки для имени и email', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      name: '',
      email: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('');
    expect(dto.email).toBe('');
  });

  it('нормализует пробелы в пустые строки и разрешает их', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      name: '   ',
      email: '   ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('');
    expect(dto.email).toBe('');
  });

  it('требует оба поля: имя и email', async () => {
    // users.service.updateProfile пишет оба поля безусловно,
    // поэтому DTO требует их наличие.
    const nameOnly = plainToInstance(UpdateProfileDto, { name: 'Петр Иванов' });
    const emailOnly = plainToInstance(UpdateProfileDto, {
      email: 'petr@example.com',
    });

    const nameErrors = await validate(nameOnly);
    const emailErrors = await validate(emailOnly);

    expect(nameErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'email' })]),
    );
    expect(emailErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'name' })]),
    );
  });

  it('нормализует email при входе', async () => {
    const dto = plainToInstance(SignInDto, {
      email: '  USER@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('не нормализует email при регистрации — CreateUserDto не наследует SignInDto', () => {
    const dto = plainToInstance(CreateUserDto, {
      email: '  REGISTERED@EXAMPLE.COM  ',
    });

    expect(dto.email).toBe('  REGISTERED@EXAMPLE.COM  ');
  });

  it('нормализует email при обновлении пользователя', () => {
    const dto = plainToInstance(UpdateUserDto, {
      email: '  UPDATED@EXAMPLE.COM  ',
    });

    expect(dto.email).toBe('updated@example.com');
  });
});
