# Тест-кейсы: Принятие изменений по остаткам (acceptShortage)

## Эндпоинт

```
POST /orders/accept-shortage/:id
Authorization: Bearer <token>
Body: {}
```

---

## 1. Статус заказа `new` — нет перемещений

### 1.1 Один товар, уменьшаем количество

**Подготовка:**
- Заказ: 1 товар (Товар А), `quantity = 10`, `price = 500`
- `shortage_stocks = [{ id: <order_product_id>, quantity: 5 }]`
- `method_receipt = "pickup"` (без доставки)
- `discount_percent = 0`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order_product.quantity` → `5`
- `order_product.reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 5 }]`
- `product_stock(1).reserved` → уменьшилось на 5
- `order.subtotal` → `2500` (5 × 500)
- `order.discount_total` → `0`
- `order.total` → `2500`
- `order.shortage_stocks` → `[]`
- Ответ: `"Изменения по остаткам приняты"`

---

### 1.2 Один товар, количество → 0

**Подготовка:**
- Заказ: 1 товар (Товар А), `quantity = 10`, `price = 500`
- `shortage_stocks = [{ id: <order_product_id>, quantity: 0 }]`
- `method_receipt = "pickup"`
- `discount_percent = 0`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order_product.quantity` → `0`
- `order_product.reservations` → `[]`
- `product_stock(1).reserved` → уменьшилось на 10
- `order.subtotal` → `0`
- `order.total` → `0`
- `order.shortage_stocks` → `[]`

---

### 1.3 Один товар, доставка курьером

**Подготовка:**
- Заказ: 1 товар (Товар А), `quantity = 10`, `price = 500`
- `shortage_stocks = [{ id: <order_product_id>, quantity: 5 }]`
- `method_receipt = "courier"` (доставка 100)
- `discount_percent = 0`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order.subtotal` → `2500` (5 × 500)
- `order.total` → `2600` (2500 + 100 доставка)
- `order.shortage_stocks` → `[]`

---

### 1.4 Несколько товаров, все уменьшены

**Подготовка:**
- Заказ: 2 товара
  - Товар А: `quantity = 10`, `price = 500`, `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`
  - Товар Б: `quantity = 20`, `price = 300`, `reservations = [{ stock_id: 2, warehouse_id: 1, quantity: 20 }]`
- `shortage_stocks = [{ id: <A>, quantity: 5 }, { id: <B>, quantity: 10 }]`
- `method_receipt = "pickup"`
- `discount_percent = 0`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Товар А: `quantity` → `5`, `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 5 }]`
- Товар Б: `quantity` → `10`, `reservations` → `[{ stock_id: 2, warehouse_id: 1, quantity: 10 }]`
- `product_stock(1).reserved` → -5
- `product_stock(2).reserved` → -10
- `order.subtotal` → `5500` (5×500 + 10×300)
- `order.total` → `5500`

---

### 1.5 Несколько товаров, один → 0

**Подготовка:**
- Заказ: 2 товара
  - Товар А: `quantity = 10`, `price = 500`
  - Товар Б: `quantity = 20`, `price = 300`
- `shortage_stocks = [{ id: <A>, quantity: 0 }, { id: <B>, quantity: 10 }]`
- `method_receipt = "pickup"`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Товар А: `quantity` → `0`, `reservations` → `[]`
- Товар Б: `quantity` → `10`, `reservations` → `[{ stock_id: 2, warehouse_id: 1, quantity: 10 }]`
- `order.subtotal` → `3000` (0×500 + 10×300)
- `order.total` → `3000`

---

### 1.6 Все товары → 0

**Подготовка:**
- Заказ: 2 товара, оба с `quantity = 10`
- `shortage_stocks = [{ id: <A>, quantity: 0 }, { id: <B>, quantity: 0 }]`
- `method_receipt = "pickup"`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order.subtotal` → `0`
- `order.total` → `0`
- Все `reservations` → `[]`
- Все `product_stock.reserved` → уменьшилось на исходное количество

---

### 1.7 Несколько товаров, скидка на корзину

**Подготовка:**
- Заказ: 2 товара
  - Товар А: `quantity = 20`, `price = 500`
  - Товар Б: `quantity = 30`, `price = 300`
- `discount_percent = 10`, `discount_name = "Скидка за объём"`
- `shortage_stocks = [{ id: <A>, quantity: 10 }, { id: <B>, quantity: 15 }]`
- `method_receipt = "pickup"`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order.subtotal` → `9500` (10×500 + 15×300)
- `order.discount_total` → `950` (9500 × 10%)
- `order.discount_percent` → `10` (без изменений!)
- `order.discount_name` → `"Скидка за объём"` (без изменений!)
- `order.total` → `8550` (9500 - 950)

---

### 1.8 Доставка курьером + скидка

**Подготовка:**
- Заказ: 1 товар, `quantity = 10`, `price = 1000`
- `discount_percent = 15`, `discount_name = "Акция"`
- `shortage_stocks = [{ id: <A>, quantity: 5 }]`
- `method_receipt = "courier"`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order.subtotal` → `5000` (5 × 1000)
- `order.discount_total` → `750` (5000 × 15%)
- `order.total` → `4350` (5000 - 750 + 100)
- `discount_percent` → `15` (без изменений)
- `discount_name` → `"Акция"` (без изменений)

---

### 1.9 Резервы с нескольких складов, уменьшаем частично

**Подготовка:**
- Заказ: 1 товар, `quantity = 30`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 25 }]`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Освобождаем 5 штук (с конца — со склада 2)
- `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 5 }]`
- `product_stock(2).reserved` → -5
- `order_product.quantity` → `25`

---

### 1.10 Резервы с нескольких складов, убираем полностью последний склад

**Подготовка:**
- Заказ: 1 товар, `quantity = 30`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 20 }]`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Освобождаем 10 штук (весь склад 2)
- `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 20 }]`
- `product_stock(2).reserved` → -10
- `order_product.quantity` → `20`

---

## 2. Статус заказа `processing` — есть перемещения

### 2.1 Один товар, одно перемещение, уменьшаем

**Подготовка:**
- Заказ: 1 товар, `quantity = 10`, `price = 500`
- `status = "processing"`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 5 }]`
- Transfer: `{ id: T1, order_id: <order>, type: "transfer", status: "processing", from_warehouse_id: 1, to_warehouse_id: 2 }`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order_product.quantity` → `5`
- `order_product.reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 5 }]`
- `product_stock(1).reserved` → -5
- Transfer T1 **остаётся** со статусом `"processing"` (не трогаем!)
- `order.shortage_stocks` → `[]`

---

### 2.2 Один товар, два перемещения (2 склада), уменьшаем

**Подготовка:**
- Заказ: 1 товар, `quantity = 30`
- `status = "processing"`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 25 }]`
- Transfer T1: `{ from: 1, to: 3, status: "processing" }`
- Transfer T2: `{ from: 2, to: 3, status: "processing" }`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Освобождаем 5 с конца (склад 2)
- `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 5 }]`
- `product_stock(2).reserved` → -5
- T1 и T2 остаются `"processing"`
- `order_product.quantity` → `25`

---

### 2.3 Два товара, оба с перемещениями

**Подготовка:**
- Заказ: 2 товара, `status = "processing"`
  - Товар А: `quantity = 20`, `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 20 }]`
  - Товар Б: `quantity = 15`, `reservations = [{ stock_id: 2, warehouse_id: 2, quantity: 15 }]`
- `shortage_stocks = [{ id: <A>, quantity: 10 }, { id: <B>, quantity: 5 }]`
- Transfer T1: `{ from: 1, to: 3, status: "processing" }`
- Transfer T2: `{ from: 2, to: 3, status: "processing" }`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Товар А: `quantity` → `10`, `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`
- Товар Б: `quantity` → `5`, `reservations` → `[{ stock_id: 2, warehouse_id: 2, quantity: 5 }]`
- `product_stock(1).reserved` → -10
- `product_stock(2).reserved` → -10
- T1 и T2 остаются `"processing"`

---

### 2.4 Один товар → 0, есть перемещения

**Подготовка:**
- Заказ: 1 товар, `quantity = 10`, `status = "processing"`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 0 }]`
- Transfer T1: `{ from: 1, to: 2, status: "processing" }`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- `order_product.quantity` → `0`
- `order_product.reservations` → `[]`
- `product_stock(1).reserved` → -10
- T1 остаётся `"processing"` (не трогаем!)
- `order.subtotal` → `0`
- `order.total` → `0` (или доставка если courier)

---

### 2.5 Все товары → 0, есть перемещения

**Подготовка:**
- Заказ: 2 товара, оба `quantity = 10`, `status = "processing"`
- `shortage_stocks = [{ id: <A>, quantity: 0 }, { id: <B>, quantity: 0 }]`
- Transfer T1: `{ from: 1, to: 2, status: "processing" }`
- Transfer T2: `{ from: 3, to: 2, status: "processing" }`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Все `quantity` → `0`
- Все `reservations` → `[]`
- Все `product_stock.reserved` → уменьшилось
- T1 и T2 остаются `"processing"`
- `order.total` → `0` (или доставка)

---

### 2.6 Резервы с 3 складов, убираем 2 склада полностью

**Подготовка:**
- Заказ: 1 товар, `quantity = 50`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 20 }, { stock_id: 2, warehouse_id: 2, quantity: 15 }, { stock_id: 3, warehouse_id: 3, quantity: 15 }]`
- `shortage_stocks = [{ id: <A>, quantity: 20 }]`
- `status = "processing"`

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:**
- Освобождаем 30 (с конца: 15 с warehouse 3 + 15 с warehouse 2)
- `reservations` → `[{ stock_id: 1, warehouse_id: 1, quantity: 20 }]`
- `product_stock(3).reserved` → -15
- `product_stock(2).reserved` → -15

---

## 3. Авторизация

### 3.1 Владелец заказа принимает

**Подготовка:**
- Заказ принадлежит `user_id = 5`
- Токен пользователя `user_id = 5`

**Действие:** `POST /orders/<id>/accept-shortage` с токеном user 5

**Ожидаемый результат:** ✅ Успех

---

### 3.2 Админ принимает за клиента

**Подготовка:**
- Заказ принадлежит `user_id = 5`
- Токен пользователя `role = "admin"`

**Действие:** `POST /orders/<id>/accept-shortage` с токеном admin

**Ожидаемый результат:** ✅ Успех

---

### 3.3 Модератор принимает за клиента

**Подготовка:**
- Заказ принадлежит `user_id = 5`
- Токен пользователя `role = "moderator"`

**Действие:** `POST /orders/<id>/accept-shortage` с токеном moderator

**Ожидаемый результат:** ✅ Успех

---

### 3.4 Чужой пользователь пытается принять

**Подготовка:**
- Заказ принадлежит `user_id = 5`
- Токен пользователя `user_id = 99`, `role = "user"`

**Действие:** `POST /orders/<id>/accept-shortage` с токеном user 99

**Ожидаемый результат:** ❌ Ошибка `"Недостаточно прав для принятия изменений в заказе <id>"`

---

### 3.5 Wholesaler пытается принять

**Подготовка:**
- Заказ принадлежит `user_id = 5`
- Токен пользователя `role = "wholesaler"`

**Действие:** `POST /orders/<id>/accept-shortage` с токеном wholesaler

**Ожидаемый результат:** ❌ Ошибка `"Недостаточно прав для принятия изменений в заказе <id>"`

---

## 4. Валидация статуса

### 4.1 Статус `new` — ок

**Подготовка:** `status = "new"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ✅ Успех

---

### 4.2 Статус `processing` — ок

**Подготовка:** `status = "processing"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ✅ Успех

---

### 4.3 Статус `ready`

**Подготовка:** `status = "ready"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ❌ Ошибка `"Невозможно принять изменения для заказа в статусе ready"`

---

### 4.4 Статус `in_delivery`

**Подготовка:** `status = "in_delivery"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ❌ Ошибка `"Невозможно принять изменения для заказа в статусе in_delivery"`

---

### 4.5 Статус `completed`

**Подготовка:** `status = "completed"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ❌ Ошибка `"Невозможно принять изменения для заказа в статусе completed"`

---

### 4.6 Статус `cancelled_new`

**Подготовка:** `status = "cancelled_new"`, `shortage_stocks` не пустой

**Ожидаемый результат:** ❌ Ошибка `"Невозможно принять изменения для заказа в статусе cancelled_new"`

---

## 5. Валидация данных

### 5.1 `shortage_stocks` пустой

**Подготовка:** `shortage_stocks = []`

**Ожидаемый результат:** ❌ Ошибка `"Нет изменений по остаткам для принятия"`

---

### 5.2 Заказ не найден

**Действие:** `POST /orders/999999/accept-shortage`

**Ожидаемый результат:** ❌ Ошибка `"Заказ 999999 не найден"`

---

### 5.3 Товар в `shortage_stocks` не существует в заказе

**Подготовка:**
- Заказ с `order_product` с `id = 10`
- `shortage_stocks = [{ id: 999, quantity: 5 }]` (несуществующий id)

**Действие:** `POST /orders/<id>/accept-shortage`

**Ожидаемый результат:** ❌ Ошибка `"Товар заказа с ID 999 не найден"`

---

## 6. Сценарии из жизни

### 6.1 "Клиент заказал 10 штук, а на складе только 7"

**Подготовка:**
- Заказ: Товар А × 10, `price = 200`, `method_receipt = "pickup"`
- Админ ставит: `shortage_stocks = [{ id: <A>, quantity: 7 }]`
- Клиент соглашается

**Действие:** `POST /orders/<id>/accept-shortage`

**Проверка:**
- `quantity` → `7`
- `subtotal` → `1400` (7 × 200)
- `total` → `1400`

---

### 6.2 "Клиент заказал 3 товара, одного нет совсем"

**Подготовка:**
- Заказ: Товар А × 5, Товар Б × 10, Товар В × 3
- Админ ставит: `shortage_stocks = [{ id: <A>, quantity: 5 }, { id: <B>, quantity: 0 }, { id: <V>, quantity: 3 }]`
- Клиент соглашается

**Проверка:**
- Товар А: `quantity` → `5` (без изменений)
- Товар Б: `quantity` → `0`
- Товар В: `quantity` → `3` (без изменений)
- `subtotal` = 5×price_A + 0×price_B + 3×price_V

---

### 6.3 "Клиент отказался — отмена заказа"

**Подготовка:**
- Заказ: Товар А × 10, `shortage_stocks = [{ id: <A>, quantity: 5 }]`

**Действие:** `PATCH /orders/<id>/reject` с `rejected_reason`

**Проверка:**
- Статус → `cancelled_customer`
- Все `reservations` освобождаются
- `shortage_stocks` НЕ очищается (остаётся как история)

---

### 6.4 "Два клиента одновременно"

**Подготовка:**
- Заказ: Товар А × 10, `shortage_stocks = [{ id: <A>, quantity: 5 }]`
- Два запроса от одного клиента одновременно

**Проверка:**
- Первый запрос: ✅ Успех
- Второй запрос: ❌ Ошибка `"Нет изменений по остаткам для принятия"` (уже очищено)

---

### 6.5 "Админ обновил дефицит пока клиент смотрит"

**Подготовка:**
1. Админ ставит `shortage_stocks = [{ id: <A>, quantity: 5 }]`
2. Клиент открывает страницу с дефицитом
3. Админ меняет на `shortage_stocks = [{ id: <A>, quantity: 3 }]`
4. Клиент нажимает "Принять" (с кодом предыдущего дефицита)

**Проверка:**
- Принимается последний `shortage_stocks` (quantity = 3, не 5)

---

### 6.6 "Клиент принял изменения, потом админ пытается изменить дефицит"

**Подготовка:**
1. Клиент принимает: `shortage_stocks → []`

**Действие:** Админ пытается `PATCH /orders/<id>/shortage` с новым дефицитом

**Проверка:**
- Админ может установить новый дефицит (если статус всё ещё `new` или `processing`)
- Клиент снова увидит новые изменения

---

### 6.7 "Заказ с доставкой, курьером, все товары уменьшены"

**Подготовка:**
- Заказ: Товар А × 10, `price = 1000`
- `method_receipt = "courier"`, `discount_percent = 10`
- `shortage_stocks = [{ id: <A>, quantity: 5 }]`

**Проверка:**
- `subtotal` → `5000`
- `discount_total` → `500` (5000 × 10%)
- `total` → `4600` (5000 - 500 + 100 доставка)

---

### 6.8 "Заказ в processing с 3 перемещениями, уменьшаем на 1 товар"

**Подготовка:**
- Заказ: 1 товар, `quantity = 40`
- `reservations = [{ stock_id: 1, warehouse_id: 1, quantity: 15 }, { stock_id: 2, warehouse_id: 2, quantity: 15 }, { stock_id: 3, warehouse_id: 3, quantity: 10 }]`
- `shortage_stocks = [{ id: <A>, quantity: 39 }]`
- 3 transfer'а в статусе `"processing"`

**Проверка:**
- Освобождается 1 штука (с конца — склад 3)
- `reservations` → `[{ ...q: 15 }, { ...q: 15 }, { stock_id: 3, warehouse_id: 3, quantity: 9 }]`
- Все 3 transfer'а остаются `"processing"`

---

## 7. Проверка после принятия

После каждого успешного принятия проверять:

1. **Можно ли менять статус?** — `POST /orders/change-status/<id>` должен работать (если `shortage_stocks = []`)
2. **Можно ли формировать перемещение?** — `POST /orders/ship` должен работать (если `shortage_stocks = []`)
3. **Можно ли отменить заказ?** — `PATCH /orders/reject/<id>` должен работать
4. **Можно ли установить новый дефицит?** — `PATCH /orders/shortage/<id>` должен работать (если статус `new` или `processing`)
