# Дефицит остатков: клиент

`POST /orders/accept-shortage/:id` — JWT, тело не отправляется. Доступно владельцу заказа (`create_user_id`) и ролям `admin`/`moderator`.

## Логика

- Статус заказа: `new` или `processing`; хотя бы одна позиция с непустым `shortage_stocks`.
- Для каждой записи дефицита ищется резервация по `(stock_id, warehouse_id)`; разница уменьшает `quantity` позиции и освобождает резервы на складе.
- Если уменьшение равно текущему количеству, позиция `order_product` удаляется; иначе `shortage_stocks` очищается.
- Пересчитываются `subtotal`, `discount_total`, `discount_quantity` и `total` (округление `Math.round`/`Math.floor`); цена за единицу не меняется.
- В статусе `processing` удаляются `processing`-трансферы типа `transfer`, чей склад-источник больше не участвует в активных резервах.

Успех: `"Изменения по остаткам приняты"`. Нет дефицита → `"Нет изменений по остаткам для принятия"`.

Отмена: `PATCH /orders/reject/:id` с `{ "rejected_reason": "..." }`; для владельца статус становится `cancelled_customer`, резервы освобождаются.

Конкурентных блокировок/ETag нет: проверяется только текущий статус на момент запроса. Код: `src/orders/orders.service.ts` (`acceptShortage`, `cleanupTransfers`).
