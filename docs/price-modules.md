# Модуль ценообразования

## Концепция

Администратор создаёт типы цен (PriceType) — каждый тип имеет минимальное количество и признак публичности.
При создании товара администратор заполняет цену для каждого нужного PriceType.

На витрине цена рассчитывается по-разному в зависимости от роли пользователя:

| Роль                  | Правило расчёта                                 |
| --------------------- | ----------------------------------------------- |
| `user`                | Обычный покупатель — цена зависит от количества |
| `admin` / `moderator` | Сотрудник — лучшая цена без учёта количества    |
| `wholesaler`          | Оптовик — лучшая цена без учёта количества      |

---

## Сущности

### PriceType — тип цены (справочник)

```typescript
@Entity()
export class PriceType {
  id: number;
  name: string; // "Розница", "От 10", "От 50" и т.д.
  description: string; // Описание для администратора
  isPublic: boolean; // true = участвует в расчёте для user
  minQuantity: number; // Минимальное количество для этого типа цены
  created_user_id: number;
  created_at: Date;
  updated_at: Date | null;
}
```

**Назначение:** Определяет ценовой уровень с привязкой к количеству.

**Поля:**

| Поле          | Описание                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Название, например "Розница", "От 10", "От 50"                                                                                        |
| `isPublic`    | Если `false` — тип не участвует в расчёте для обычных покупателей (`user`). Для `admin`/`moderator`/`wholesaler` — участвуют все типы |
| `minQuantity` | Минимальное количество, с которого применяется этот тип цены (учитывается только для `user`)                                          |

**Пример справочника:**

| id  | name    | isPublic | minQuantity | description                     |
| --- | ------- | -------- | ----------- | ------------------------------- |
| 1   | Розница | true     | 1           | Стандартная розничная цена      |
| 2   | От 10   | true     | 10          | Скидка при покупке от 10 единиц |
| 3   | От 50   | true     | 50          | Скидка при покупке от 50 единиц |

---

### ProductPrice — цена товара для типа цены

```typescript
@Entity()
export class ProductPrice {
  id: number;
  product_id: number; // FK → Product
  price_type_id: number; // FK → PriceType
  price: number; // Цена в копейках (int)
  price_type: PriceType; // eager: true — загружается автоматически
  created_at: Date;
  updated_at: Date | null;
}
```

**Назначение:** Связывает товар с типом цены и фиксирует конкретное значение цены.

**Правила:**

- На один товар может быть несколько ProductPrice (по одному на каждый PriceType)
- Если для какого-то PriceType цена не задана — товар не продаётся по этому уровню
- Если для товара нет ни одной ProductPrice — товар не показывается на витрине

**Пример для товара "Вилка" (закупка = 40₽):**

| id  | product_id | price_type_id | price |
| --- | ---------- | ------------- | ----- |
| 1   | 1          | 1 (Розница)   | 100   |
| 2   | 1          | 2 (От 10)     | 85    |
| 3   | 1          | 3 (От 50)     | 60    |

---

## Процесс создания товара (админка)

При создании/редактировании товара администратор видит все существующие PriceType:

```

Товар: Вилка
Закупочная цена: 40₽

┌─ Цены ──────────────────────────────────────┐
│                                             │
│  ☑ Розница (от 1, публичный) ...... 100 ₽   │
│  ☑ От 10 (от 10, публичный) ....... 85 ₽    │
│  ☑ От 50 (от 50, публичный) ....... 60 ₽    │
│  ☐ Себестоимость (не публичный) .... 40 ₽   │
│                                             │
│  [Добавить цену]                            │
└─────────────────────────────────────────────┘

```

- Администратор вводит цену для нужных типов (пустые поля — не создаются)
- PriceType с любым `isPublic` отображаются в админке

---

## Алгоритм расчёта: getCurrentPrice

```
getCurrentPrice(product_id, quantity, user_role) → number (0 если цена не найдена)
```

### Сигнатура метода

```typescript
async getCurrentPrice(
  product_id: number,
  quantity: number,
  user_role: string, // "admin" | "moderator" | "wholesaler" | любая другая строка (user)
): Promise<number>
```

### Логика расчёта

```
ВХОД: product_id = 1, quantity = 5, user_role = "user"
      Цены: (Розница, minQty=1,  price=100, isPublic=true)
            (От 10,    minQty=10, price=85,  isPublic=true)
            (От 50,    minQty=50, price=60,  isPublic=true)

1. Загрузить все ProductPrice для товара через productPriceRepository.find()
   (price_type загружается автоматически, т.к. eager: true)

2. Для каждой цены проверяем:

   ─── user_role является staff (admin | moderator | wholesaler) ───
     игнорирует isPublic и minQuantity
     выбирает минимальную ненулевую цену среди ВСЕХ записей

   ─── user_role НЕ является staff (обычный пользователь) ───
     фильтр: PriceType.isPublic === true
     фильтр: (PriceType.minQuantity ?? 1) <= quantity
     выбирает минимальную ненулевую цену среди подходящих

3. Если ни одна цена не подошла — возвращает 0
```

### Примеры расчёта

Товар "Вилка": Розница=100 (minQty=1, public), От 10=85 (minQty=10, public), От 50=60 (minQty=50, public), Себест.=40 (minQty=1, не public)

| Роль       | Кол-во | Результат | Пояснение                                                        |
| ---------- | ------ | --------- | ---------------------------------------------------------------- |
| user       | 1      | 100       | Подходит только Розница (isPublic, minQty 1 <= 1)                |
| user       | 5      | 100       | Подходит только Розница (От 10 не проходит по minQty)            |
| user       | 10     | 85        | Подходят Розница и От 10 → MIN(price) = 85                       |
| user       | 25     | 85        | Подходят Розница и От 10 → MIN(price) = 85                       |
| user       | 50     | 60        | Подходят все три публичные → MIN(price) = 60                     |
| admin      | любое  | 40        | MIN(price) среди всех, Себестоимость самая дешёвая               |
| moderator  | любое  | 40        | MIN(price) среди всех                                            |
| wholesaler | любое  | 40        | MIN(price) среди всех                                            |
| user       | 0      | 0         | quantity=0, minQty>=1 → ни одна цена не подходит, возврат 0     |

### Граничные случаи

| Ситуация                                        | Поведение                    |
| ----------------------------------------------- | ---------------------------- |
| Товар без цен                                   | Возвращает 0                 |
| Нет публичных цен (user)                        | Возвращает 0                 |
| Нет подходящего minQuantity для quantity (user) | Возвращает 0                 |
| Все цены = 0                                    | Возвращает 0                 |
| quantity = 0                                    | Ни одна цена не подходит → 0 |
| minQuantity = null                              | Считается как 1              |
| price = null                                    | Считается как 0              |

---

## Реализация

```typescript
// src/product-price/product-price.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductPrice } from "./entities/product-price.entity";

@Injectable()
export class ProductPriceService {
  constructor(
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
  ) {}

  /**
   * Рассчитывает цену товара с учётом роли пользователя и количества.
   *
   * - admin / moderator / wholesaler: минимальная ненулевая цена среди всех типов
   * - остальные (user): минимальная ненулевая публичная цена,
   *   с учётом минимального количества (PriceType.minQuantity)
   *
   * Возвращает 0, если подходящая цена не найдена.
   */
  async getCurrentPrice(
    product_id: number,
    quantity: number,
    user_role: string,
  ): Promise<number> {
    let price = 0;

    const prices = await this.productPriceRepository
      .find({
        where: { product_id },
        select: ["price_type_id", "price", "price_type"],
        relations: ["price_type"],
      })
      .catch((error) => {
        throw `Не удалось получить список цен товаров, ${error.message}`;
      });

    for (let i = 0; i < prices.length; i++) {
      const itemPrice = prices[i].price ?? 0;

      // Сотрудники и оптовики — без фильтров, просто самая дешёвая цена
      if (
        user_role === "admin" ||
        user_role === "moderator" ||
        user_role === "wholesaler"
      ) {
        if ((itemPrice && !price) || (itemPrice && price && itemPrice < price)) {
          price = itemPrice;
        }
      } else {
        // Обычный покупатель — с учётом isPublic и minQuantity
        const minQuantity = prices[i].price_type.minQuantity ?? 1;

        if (
          prices[i].price_type.isPublic &&
          quantity >= minQuantity &&
          ((itemPrice && !price) || (itemPrice && price && itemPrice < price))
        ) {
          price = itemPrice;
        }
      }
    }

    return price;
  }
}
```

### Особенности реализации

- `price_type` загружается автоматически благодаря `eager: true` в сущности `ProductPrice`
- Если `minQuantity` в БД равен `NULL`, используется значение `1`
- Если `price` в БД равен `NULL`, используется значение `0` (запись игнорируется, т.к. `itemPrice &&` даст `false`)
- Функция **не выбрасывает исключение** при отсутствии цен — просто возвращает `0`

---

## Будущие расширения

Текущая архитектура позволяет добавлять новые возможности без изменения существующего алгоритма:

### 1. Групповые скидки для оптовиков

Если оптовику нужна не лучшая цена, а **специальная оптовая цена** — создаётся PriceType с `isPublic=false`, и алгоритм для `wholesaler` использует его.

### 2. Per-product quantity override

Если нужно переопределить minQuantity для конкретного товара — добавить поле `minQuantity` в `ProductPrice` как override к `PriceType.minQuantity`.

### 3. Приоритет PriceType

Если нужно выбирать не по `MIN(price)`, а по приоритету PriceType — добавить поле `priority` в `PriceType` и сортировать по нему.

### 4. Pipeline стратегий

Вынести расчёт в отдельный класс с интерфейсом `PriceStrategy` — замена реализации через DI без изменения кода вызова.

### 5. Возврат ошибки вместо 0

Если в будущем потребуется отличать "цена не найдена" от "цена равна нулю" — можно заменить возврат `0` на выброс `NotFoundException` с конкретным сообщением в зависимости от роли пользователя.
