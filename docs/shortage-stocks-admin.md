# Дефицит остатков: админка

`PATCH /orders/shortage/:id` —JWT + роли `admin`/`moderator`. `:id` — ID заказа.

## Тело

```json
{ "items": [{ "id": 123, "quantity": 12, "warehouse_id": 1, "stock_id": 45 }] }
```

`id` — `order_product.id`, `quantity` ≥ 0, `warehouse_id` обязателен, `stock_id` опционален в DTO, но нужен сервису для сопоставления резервации. Дубли `stock_id` запрещены.

## Правила

- Статус заказа: `new` или `processing`.
- Дефицит хранится на товаре заказа (`order_product.shortage_stocks`) как `{ stock_id, warehouse_id, quantity }`, а не на заказе.
- Повторная установка объединяется по `(stock_id, warehouse_id)`; при `quantity`, равном резервации, запись дефицита удаляется.
- Количество сравнивается с текущим `orderProduct.quantity`; проверки принадлежности позиции этому заказу нет.
- Сама установка не меняет количество, цены и итоги заказа; клиент видит изменение через `GET /order-product/order/:order_id`.

Успех: `message: "Запрос на изменение остатков обновлен"`. Ответ — стандартная обёртка `{ data, status, errors, message }` (`src/helpers/response.ts`).
