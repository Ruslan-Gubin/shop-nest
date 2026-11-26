# SMS outbox

Бекенд не отправляет SMS: записи кладутся в `sms_outbox`, устройство владельца забирает их и сообщает результат. Код: `src/sms/`.

## Поток

1. `POST /sms/request-otp` — `{ phone, device_id?, hash_code }`. Код 6 цифр (argon2-хэш), TTL 5 мин; `hash_code` добавляется в текст SMS. Rate limit — 1 SMS в 60 сек **по `device_id`** (без него лимита нет).
2. `GET /sms/outbox?sender_phone=` — атомарно берёт одну задачу (`pending` или ретраимая ошибка) с `pessimistic_write`/`skip_locked`; просроченные записи удаляются. Нет задач → `data: null`.
3. `POST /sms/outbox-delivered/:id` или `POST /sms/outbox-failed/:id` с `{ error_code? }` (≤50 символов). Статусы: `no_balance` → `failed_no_balance`, `invalid_number` → `failed_invalid_number`, `gateway`/`network`/`timeout` → `failed_gateway`, остальное → `failed`.
4. `POST /auth/verify-otp { phone, code }` — проверка хэша, TTL и 5 попыток; успешная запись удаляется, пользователь создаётся по телефону, выдаются токены.

## Правила

- Ретраятся только `failed`, `failed_no_balance`, `failed_gateway`; `failed_invalid_number` в выборку не попадает.
- Одно устройство не берёт одну запись дважды: его номер добавляется в `sender_phones`.
- `GET /sms/can-send-sms` — `true`, если был опрос outbox за последние 30 сек (не реестр устройств).
- Все роуты `sms` публичные; аутентификация устройств не реализована.
- Поля `error_reason`, `delivery_attempts` отсутствуют; код сейчас логируется в консоль (`sms.service.ts:58`) — убрать перед продом.
