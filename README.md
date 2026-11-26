# shop-nest

Backend магазина на NestJS 11 + TypeORM + PostgreSQL.

## Запуск

```bash
docker-compose up -d   # PostgreSQL: localhost:5432, postgres/123456
npm install
npm run start:dev      # http://localhost:4010 (PORT по умолчанию)
```

JWT-guard глобальный; публичные роуты помечаются `@Public()`.

## Окружение

- `NEO_DB_HOST`, `NEO_DB_PORT`, `NEO_DB_DATABASE`, `NEO_DB_USERNAME`, `NEO_DB_PASSWORD` — БД (в `start:dev` захардкожены localhost:5432 / postgres / 123456);
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET` — токены;
- `PORT` — порт, иначе 4010.

## Команды

`npm run build` · `npm test` · `npm run test:cov` · `npm run test:e2e` · `npm run lint` · `npm run format`

## Документация

- [Ценообразование](docs/price-modules.md)
- [Скидки](docs/discount-rules.md)
- [Фильтры каталога](docs/product-filters.md)
- [SMS outbox](docs/sms-module.md)
- [Дефицит: админка](docs/shortage-stocks-admin.md)
- [Дефицит: клиент](docs/shortage-stocks-customer.md)
- [Тесты: структура и соглашения](docs/testing.md)
