# API: Установка проблемных остатков (shortage_stocks)

## PATCH /orders/:id/shortage

Эндпоинт для администратора/модератора. Позволяет указать реальное количество товаров на складе, если оно отличается от заказанного.

## Аутентификация

- Требуется JWT токен
- Роль: `admin` или `moderator`

## URL Parameters

| Параметр | Тип | Описание |
| -------- | --- | -------- |
| id | int | ID заказа |

## Request Body

```json
{
  "shortage_stocks": [
    { "id": 123, "quantity": 12 },
    { "id": 456, "quantity": 0 }
  ]
}
```

### Поля

| Поле | Тип | Описание |
| ---- | --- | -------- |
| shortage_stocks | array | Массив проблемных позиций |
| shortage_stocks[].id | int | ID товара заказа (`order_product.id`) |
| shortage_stocks[].quantity | int | Реальное количество на складе (0 если закончился) |

## Валидация

- Статус заказа должен быть `new` или `processing`
- Каждый `id` должен существовать в `order_products` данного заказа
- `quantity` должен быть >= 0 и <= исходного количества товара в заказе
- Дубли `id` в массиве запрещены

## Response (успех)

```json
{
  "data": null,
  "status": "success",
  "errors": [],
  "message": "Проблемные остатки обновлены"
}
```

## Response (ошибка)

```json
{
  "data": null,
  "status": "error",
  "errors": [],
  "message": "Невозможно установить дефицит для заказа в статусе completed"
}
```

## Примеры

### Товара не хватает (12 из 20)

```json
PATCH /orders/42/shortage
{
  "shortage_stocks": [
    { "id": 123, "quantity": 12 }
  ]
}
```

### Товар закончился

```json
PATCH /orders/42/shortage
{
  "shortage_stocks": [
    { "id": 123, "quantity": 0 }
  ]
}
```

### Несколько позиций с дефицитом

```json
PATCH /orders/42/shortage
{
  "shortage_stocks": [
    { "id": 123, "quantity": 12 },
    { "id": 456, "quantity": 0 },
    { "id": 789, "quantity": 3 }
  ]
}
```

### Повторное определение дефицита (перезапись)

Предыдущее значение `shortage_stocks` перезаписывается новым.

## Влияние на заказ

- Установка `shortage_stocks` **не изменяет** количество, цены или итоги заказа
- Поле `shortage_stocks` сохраняется в заказе и доступно клиенту
- Клиент видит предложенные изменения на карточке заказа и принимает решение