# Тесты

Unit-тесты лежат рядом с модулем, в `src/<module>/test/`; e2e — в корневом `test/` рядом с `app.e2e-spec.ts`. Один файл — на один тестируемый класс или сложный метод.

| Файл                                                  | Что проверяет                                                             | Запуск             |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ |
| `src/<module>/test/<module>.controller.spec.ts`       | delegates в сервис и обёртку `responseData`; зависимости подменены моками | `npm test`         |
| `src/<module>/test/<module>.service.spec.ts`          | бизнес-логику сервиса; репозиторий и другие сервисы подменены моками      | `npm test`         |
| `src/<module>/test/<module>.service.<method>.spec.ts` | отдельный сложный метод, если сценариев много                             | `npm test`         |
| `test/<feature>.e2e-spec.ts`                          | HTTP-роуты, guards и валидацию через Supertest                            | `npm run test:e2e` |

«Интеграционный» тест с моками на границах (например, `orders.service.integration.spec.ts`) остаётся в `src/<module>/test/`; в корневом `test/` только e2e через HTTP.

Примеры имён: `src/orders/test/orders.controller.spec.ts`, `src/product/test/product.service.getFilters.spec.ts`, `test/app.e2e-spec.ts`. Конфигурации разделены: `jest.config.json` (`rootDir: src`, `.*\.spec\.ts$`) и `test/jest-e2e.json` (`rootDir: ..`, `.e2e-spec.ts$`).

Тестируем поведение, а не детали реализации: один сценарий — одно ожидание, моки через `jest.fn()` и `Test.createTestingModule`, данные — через фабрики. Для e2e глобальный `JwtGuard` и провайдеры переопределяются через `overrideGuard`/`overrideProvider`; реальная БД не используется. В примерах NestJS используется Vitest, но в этом проекте Jest + ts-jest (`jest.config.json`) — импортировать `vitest` не нужно.

Ссылки: [NestJS Testing](https://docs.nestjs.com/fundamentals/testing), [пример раздельных controller/service spec](https://github.com/nestjs/nest/tree/master/sample/01-cats-app/src/cats), [пример e2e](https://github.com/nestjs/typescript-starter/blob/master/test/app.e2e-spec.ts), [The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications).
