# Скидки на заказ

Применяется **одна** лучшая скидка: скидка на корзину или акция. Скидки не суммируются; при равном проценте побеждает акция (`src/orders/orders.service.ts:403-427`).

## Источники

- **Скидка на корзину** (`cart_discount`): активная (`is_active`), подходящая по типу пользователя (`apply_to`: `user` → `all`/`retail`, staff → `all`/`wholesale`, остальные → `all`) и с `total >= min_sum`. Берётся **максимальный** `percent` (`cart-discounts.service.ts:15-31,104-117`).
- **Акция** (`promotion`): active по датам `date_from`/`date_to`; берётся максимальный `percent` среди всех подходящих (`promotions.service.ts:21-37`). Пересечение дат запрещено при создании/обновлении. Поля называются `date_from`/`date_to`, не `validFrom`/`validTo`.

## Расчёт

Сумма берётся из `calculatePricesForOrder`: `total` — цена по роли с учётом `minQuantity`, `subtotal` — максимум из цен товара. Скидка считается от `total`: `discount_total = round(total × percent / 100)`, итог `total = floor(total - discount_total + delivery_price)`.

Подсказки «до следующей скидки» в API не реализованы.
