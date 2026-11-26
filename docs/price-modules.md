# Ценообразование

Цены задаются справочником типов цен (`PriceType`) и записями цен товара (`ProductPrice`). Код: `src/price-type/`, `src/product-price/`, расчёт заказа — `src/product/product.service.ts`.

## Сущности

- `PriceType`: `name`, `isPublic`, `minQuantity` (nullable, по умолчанию 1). `isPublic` означает, что тип виден обычному `user`.
- `ProductPrice`: `product_id`, `price_type_id`, `price`. Связь `price_type` не eager — загружается явно через `relations`.
- Цены создаются отдельно от товара; `POST /product` не заполняет их автоматически.

## Каталог

`findByIds` подгружает цены и через `getProductUserPrices` (`product-price.service.ts:52-98`) строит `price_list`:

- `admin` / `moderator` / `wholesaler` — одна минимальная ненулевая цена среди всех типов;
- `user` — все ненулевые публичные цены; `minQuantity` берётся из `price_type`.

Видимость товара (`buildMainPageWhere`, `product.service.ts:156-179`): есть остаток и цена > 0; для `user` цена должна быть у публичного типа.

## Заказ

`orders.service.ts:356-360` вызывает `calculatePricesForOrder` → `getCurrentPrices` (`product.service.ts:91-154`). Начиная с каталожного `price_list`, для **всех** ролей проверяется `quantity >= minQuantity`: `price` — минимальная подходящая, `subPrice` — максимальная в списке. `total = Σ quantity × price`, `subtotal = Σ quantity × subPrice`, `discount_quantity = subtotal - total`.

`ProductPriceService.getCurrentPrice` (`product-price.service.ts:136-181`) — legacy-метод с похожей логикой, но в проде не вызывается.
