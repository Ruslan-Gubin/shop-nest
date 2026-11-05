# Каталоговые фильтры товаров (`GET /product/filters`)

Единый самодостаточный документ: назначение, полный исходный код, зависимости,
принцип работы, формат запроса/ответа, реальные примеры и все тест-кейсы.

---

## 1. Зачем это нужно

Страница каталога должна показывать пользователю **актуальные** варианты фильтров:
после выбора категории, поиска, типа товара, страны, цены и характеристик —
список доступных значений должен сужаться, а не оставаться «застывшим».

Функция `getFilters` решает три задачи:

1. **Фасеты** — для каждого фильтра считает доступные значения с учётом всех
   остальных активных фильтров (но без учёта собственного — иначе выбранное
   значение «съело» бы все альтернативы).
2. **Диапазон цен** — отдаёт реальные `min`/`max` по текущей выборке, причём
   цена считается по-разному для покупателя и сотрудника (см. §5.1).
3. **Характеристики** — отдаёт только осмысленные характеристики (2+ значения,
   максимум 5), скрывает их при неоднозначном типе товара и сохраняет
   выбранную характеристику видимой даже с одним значением, чтобы её можно было снять.

---

## 2. Расположение и точка входа

| Что | Файл |
| --- | --- |
| HTTP-эндпоинт | `src/product/product.controller.ts:30-70` |
| Основная функция | `src/product/product.service.ts:580-824` |
| Построитель WHERE | `src/product/product.service.ts:495-578` |
| Парсер характеристик | `src/product/product.service.ts:467-493` |
| Парсер списков | `src/product/product.service.ts:454-465` |
| Условие видимости товара | `src/product/product.service.ts:139-162` |
| Тесты | `src/product/test/product.service.getFilters.spec.ts` |

```
GET /product/filters?category_id=...&search=...&product_types=...&specifications=...&country=...&price_from=...&price_to=...
```

Контроллер помечен `@Public()` + `OptionalJwtAuthGuard`: эндпоинт доступен без
токена. Роль берётся из токена, если он есть, иначе `user`
(`product.controller.ts:56-57`). Ответ всегда оборачивается в `responseData`
(`src/helpers/response.ts`).

---

## 3. Входные параметры

Все параметры — необязательные query-строки.

| Параметр | Формат | Пример | Смысл |
| --- | --- | --- | --- |
| `category_id` | число | `214` | Категория + все её потомки |
| `search` | строка | `Ручка` | `ILIKE %...%` по `name` и `description` |
| `product_types` | CSV | `Ручка,Кастрюля` | Типы товара (`product.product_type`) |
| `country` | CSV | `Китай,Россия` | Страны (`product.country`) |
| `price_from` | число | `100` | Нижняя граница цены |
| `price_to` | число | `500` | Верхняя граница цены |
| `specifications` | `id:value` CSV | `67:Гелевая,73:28 см` | Характеристики; несколько значений одного id — через запятую |

### 3.1 `product_types`, `country`

`parseFilterList` режет строку по `,`, обрезает пробелы, убирает пустые
элементы и дубликаты (`Set`). Пустая строка → `[]`.

### 3.2 `specifications`

`parseSpecificationFilters` разбирает пары `specification_id:value`:

- разделитель id и значения — **первое** двоеточие (`pair.indexOf(":")`),
  поэтому значение может само содержать двоеточие;
- пробелы по краям значения обрезаются;
- пары без двоеточия, с нечисловым id или пустым значением **молча
  игнорируются**;
- результат — `Map<number, string[]>`: несколько значений одного id
  складываются в массив (это реализует «ИЛИ» внутри характеристики);
- разные id объединяются через «И» (см. §5.3).

```
67:Гелевая,67:Шариковая,73:28 см
→ Map { 67 => ["Гелевая", "Шариковая"], 73 => ["28 см"] }
```

### 3.3 Цена

`price_from` / `price_to` приводятся к числу. Пустая строка и `NaN`
трактуются как «граница не задана» (`product.service.ts:620-627`).

---

## 4. Формат ответа

```typescript
{
  data: {
    price: { min: number; max: number };
    specifications: {
      id: number;
      name: string;
      type: string;      // "text" | "color" | ...
      values: string[];  // отсортированы натурально
    }[];
    countries: string[];     // DISTINCT, по алфавиту
    product_types: string[]; // DISTINCT, по алфавиту
  } | null;
  status: "success" | "error";
  message: string;
  errors: { key: string; message: string }[];
}
```

- При успехе: `status: "success"`, `message: "Фильтры получены"`.
- При ошибке БД: `data: null`, `status: "error"`, в `message` — текст
  `Не удалось получить ... , <db error>` (сервис бросает строку, контроллер
  ловит её и передаёт в `responseData`).
- `price.min`/`price.max` — `0`, если выборка пуста.
- `specifications` — `[]`, если характеристики скрыты правилами §5.4 или
  значений не осталось.

---

## 5. Принцип работы

### 5.1 Роль и расчёт цены

```typescript
const sortPriceType = role === "admin" || role === "moderator" || role === "wholesaler"
  ? "MIN"
  : "MAX";
```

| Роль | Агрегат по `product_price` | Почему |
| --- | --- | --- |
| `admin`, `moderator`, `wholesaler` | `MIN(price)` | Сотруднику/оптовику показываем лучшую (минимальную) цену |
| `user` (и гость) | `MAX(price)` | Покупателю — цена розничного/публичного уровня |

Дополнительно `buildMainPageWhere` (роль-зависимо) ограничивает выборку
товарами, у которых есть остаток на складе и положительная цена. Для
`user` цена обязана быть у **публичного** типа цены (`price_type.isPublic`),
для сотрудников — у любого.

### 5.2 Категория

`categoryService.getCategoryAndAllChildrenIds(Number(category_id))` возвращает
id самой категории и всех вложенных. Фильтр:
`p.category_id = ANY($n::int[])`. Если `category_id` не передан — ограничения
по категории нет.

### 5.3 Как строится WHERE (`buildFilterConditionGroup`)

Функция собирает параметризованный WHERE из частей:

| Часть | Условие | Можно исключить |
| --- | --- | --- |
| База | `buildMainPageWhere(role)` (заменяет `product.` → `p.`) | нет |
| Категория | `p.category_id = ANY($n::int[])` | нет |
| Поиск | `(p.name ILIKE $n OR p.description ILIKE $n)` | нет |
| Тип | `p.product_type = ANY($n::text[])` | `exclude: "product_types"` |
| Страна | `p.country = ANY($n::text[])` | `exclude: "countries"` |
| Цена | `(SELECT COALESCE(MIN/MAX(pp.price),0) ...) >= / <= $n` | `exclude: "price"` |
| Характеристики | `p.id IN (SELECT ... WHERE specification_id = $n AND value = ANY($n::text[]))` | `exclude: "specifications"` |

Характеристики добавляются **по одной на каждый id**: разные id — «И»,
значения внутри id — «ИЛИ» (`value = ANY(array)`).

### 5.4 Самоисключение фасетов

Каждый фасет считается своим вызовом с собственным `exclude`:

| Фасет | Исключает себя | Учитывает |
| --- | --- | --- |
| `price` | `price` | категорию, поиск, тип, страну, характеристики |
| `countries` | `countries` | категорию, поиск, тип, цену, характеристики |
| `product_types` | `product_types` | категорию, поиск, страну, цену, характеристики |
| `specifications` | — (учитывает **всё**) | все фильтры, включая сами характеристики |

Именно поэтому в примере `?search=Ручка&product_types=Кастрюля` в
`product_types` всё ещё видны все 7 типов: фасет типов не применяет
собственный выбранный тип. А `specifications` наоборот сужается выбранной
характеристикой — иначе можно было бы выбрать несовместимые значения.

> Важно: цена не «застывала» из-за цены. Прежняя проблема была в том, что
> фасет характеристик не применял выбранные характеристики; сейчас он их
> применяет.

### 5.5 Правила показа характеристик

1. **Скрытие при неоднозначном типе** (`product.service.ts:711-713`):

   ```typescript
   const hideSpecifications =
     selectedProductTypes.length > 1 ||
     (selectedProductTypes.length === 0 && productTypes.length > 1);
   ```

   | Выбранных типов | Доступных типов | Характеристики |
   | --- | --- | --- |
   | 0 | 0 | показываются |
   | 0 | 1 | показываются сразу |
   | 0 | >1 | `[]` — сначала надо выбрать тип |
   | 1 | любой | показываются |
   | >1 | любой | `[]` — наборы характеристик несопоставимы |

   Если характеристики скрыты, SQL `spec_stats` даже не выполняется
   (`specsResult` остаётся `[]`).

2. **Только осмысленные значения** (`HAVING`):
   `COUNT(DISTINCT ps.value) > 1`.

3. **Лимит 5 характеристик**: `LIMIT 5`.

4. **Активная характеристика — исключение** (вариант A):
   `COUNT(DISTINCT ps.value) > 1 OR s.id = ANY($n::int[])` — выбранная
   характеристика остаётся в ответе даже с одним значением, чтобы
   пользователь мог снять фильтр.

5. **Активные — выше в списке**:
   `ORDER BY (s.id = ANY($n)) DESC, value_count DESC, product_count DESC, s.name`,
   затем при формировании объектов значения сортируются натурально
   (`localeCompare` с `numeric: true`: `"0.2 мм"` < `"0.3 мм"`).

6. **Технические характеристики исключены**:
   `s.name NOT IN ('Артикул', 'Штрих-код', 'Код товара')`.

7. **Финальная страховка** (`product.service.ts:818-820`): в ответ попадают
   только характеристики с `values.length > 1` **или** активные. Это
   отсекает характеристику, у которой после применения всех фильтров осталось
   одно значение (например, была активна другая характеристика).

### 5.6 Внутренние запросы (4 запроса)

1. **Цена** — подзапрос по `product p` с `exclude: "price"`, затем
   `MIN/MAX` по вычисленной цене.
2. **Страны** — `SELECT DISTINCT p.country ... AND p.country != '' ORDER BY`.
3. **Типы** — `SELECT DISTINCT p.product_type ... AND p.product_type != '' ORDER BY`.
4. **Характеристики** — CTE `filtered` (все фильтры) + `spec_stats`
   (агрегация и `HAVING`/`ORDER BY`/`LIMIT 5`) + join значений.

Все четыре запроса выполняются последовательно, каждый со своими
`params` (позиционные `$1..$n` не переиспользуются между запросами).

---

## 6. Исходный код

### 6.1 Контроллер (`src/product/product.controller.ts:30-70`)

```typescript
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Get("filters")
async getFilters(
  @CurrentUser() user?: CurrentStrategyUser,
  @Query("category_id") category_id?: string,
  @Query("search") search?: string,
  @Query("product_types") product_types?: string,
  @Query("specifications") specifications?: string,
  @Query("country") country?: string,
  @Query("price_from") price_from?: string,
  @Query("price_to") price_to?: string,
): Promise<ResponseData<{...} | null>> {
  try {
    const filters = await this.productService.getFilters({
      role: user?.role ?? "user",
      category_id, search, product_types, specifications, country, price_from, price_to,
    });
    return responseData(filters, "success", [], "Фильтры получены");
  } catch (error) {
    return responseData(null, "error", [], error);
  }
}
```

### 6.2 `getFilters` (`src/product/product.service.ts:580-824`)

```typescript
async getFilters({
  role, category_id, search, product_types, specifications, country, price_from, price_to,
}: {
  role: string;
  category_id?: string;
  search?: string;
  product_types?: string;
  specifications?: string;
  country?: string;
  price_from?: string;
  price_to?: string;
}): Promise<{
  price: { min: number; max: number };
  specifications: { id: number; name: string; type: string; values: string[] }[];
  countries: string[];
  product_types: string[];
}> {
  const sortPriceType: "MIN" | "MAX" =
    role === "admin" || role === "moderator" || role === "wholesaler" ? "MIN" : "MAX";

  const categoryIds = category_id
    ? await this.categoryService.getCategoryAndAllChildrenIds(Number(category_id))
    : [];

  const selectedProductTypes = this.parseFilterList(product_types);
  const selectedCountries = this.parseFilterList(country);
  const specificationGroups = this.parseSpecificationFilters(specifications);
  const selectedSpecificationIds = Array.from(specificationGroups.keys());
  const priceFrom =
    price_from !== undefined && price_from !== "" && !Number.isNaN(Number(price_from))
      ? Number(price_from)
      : undefined;
  const priceTo =
    price_to !== undefined && price_to !== "" && !Number.isNaN(Number(price_to))
      ? Number(price_to)
      : undefined;

  const baseOptions = {
    role, categoryIds, search,
    selectedProductTypes, selectedCountries,
    priceFrom, priceTo, specificationGroups, sortPriceType,
  };

  // 1. Цена — без собственного ценового фильтра
  const priceFilter = this.buildFilterConditionGroup({ ...baseOptions, exclude: "price" });
  const priceResult = await this.productRepository.query(
    `
      SELECT
        COALESCE(MIN(sub.price), 0) AS min_price,
        COALESCE(MAX(sub.price), 0) AS max_price
      FROM (
        SELECT (SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0) AS price
        FROM product p
        ${priceFilter.where}
      ) sub
    `,
    priceFilter.params,
  ).catch((error) => { throw `Не удалось получить диапазон цен, ${error.message}`; });

  // 2. Страны — без собственного фильтра стран
  const countriesFilter = this.buildFilterConditionGroup({ ...baseOptions, exclude: "countries" });
  const countriesWhere = countriesFilter.where
    ? `${countriesFilter.where} AND p.country != ''`
    : `WHERE p.country != ''`;
  const countriesResult = await this.productRepository.query(
    `SELECT DISTINCT p.country FROM product p ${countriesWhere} ORDER BY p.country`,
    countriesFilter.params,
  ).catch((error) => { throw `Не удалось получить список стран, ${error.message}`; });
  const countries = countriesResult.map((row: { country: string }) => row.country);

  // 3. Типы товаров — без собственного фильтра типов
  const productTypesFilter = this.buildFilterConditionGroup({ ...baseOptions, exclude: "product_types" });
  const productTypesWhere = productTypesFilter.where
    ? `${productTypesFilter.where} AND p.product_type != ''`
    : `WHERE p.product_type != ''`;
  const productTypesResult = await this.productRepository.query(
    `SELECT DISTINCT p.product_type FROM product p ${productTypesWhere} ORDER BY p.product_type`,
    productTypesFilter.params,
  ).catch((error) => { throw `Не удалось получить список типов товаров, ${error.message}`; });
  const productTypes = productTypesResult.map((row: { product_type: string }) => row.product_type);

  // 4. Характеристики — только если тип однозначен
  const hideSpecifications =
    selectedProductTypes.length > 1 ||
    (selectedProductTypes.length === 0 && productTypes.length > 1);

  let specsResult: {
    spec_id: number | string; spec_name: string; spec_type: string; value: string;
  }[] = [];

  if (!hideSpecifications) {
    const specsFilter = this.buildFilterConditionGroup(baseOptions); // учитывает ВСЁ, включая характеристики
    const specsParams: unknown[] = [...specsFilter.params];

    let selectedSpecIdsCondition = "";
    if (selectedSpecificationIds.length > 0) {
      specsParams.push(selectedSpecificationIds);
      selectedSpecIdsCondition = `s.id = ANY($${specsParams.length}::int[])`;
    }

    const keepSelectedSpecsCondition = selectedSpecIdsCondition
      ? `COUNT(DISTINCT ps.value) > 1 OR ${selectedSpecIdsCondition}`
      : `COUNT(DISTINCT ps.value) > 1`;
    const selectedSpecsOrder = selectedSpecIdsCondition
      ? `(${selectedSpecIdsCondition}) DESC, `
      : "";

    specsResult = await this.productRepository.query(
      `
        WITH filtered AS (
          SELECT p.id FROM product p ${specsFilter.where}
        ),
        spec_stats AS (
          SELECT
            s.id,
            s.name,
            s.type,
            COUNT(DISTINCT ps.value)::int AS value_count,
            COUNT(DISTINCT ps.product_id)::int AS product_count
          FROM product_specification ps
          INNER JOIN specification s ON s.id = ps.specification_id
          WHERE ps.product_id IN (SELECT id FROM filtered)
            AND s.name NOT IN ('Артикул', 'Штрих-код', 'Код товара')
          GROUP BY s.id, s.name, s.type
          HAVING ${keepSelectedSpecsCondition}
          ORDER BY ${selectedSpecsOrder}value_count DESC, product_count DESC, s.name
          LIMIT 5
        )
        SELECT
          ss.id AS spec_id,
          ss.name AS spec_name,
          ss.type AS spec_type,
          ps.value
        FROM spec_stats ss
        INNER JOIN product_specification ps ON ps.specification_id = ss.id
        INNER JOIN filtered f ON f.id = ps.product_id
        GROUP BY ss.id, ss.name, ss.type, ps.value, ss.value_count, ss.product_count
        ORDER BY ss.value_count DESC, ss.product_count DESC, ss.name, ps.value
      `,
      specsParams,
    ).catch((error) => { throw `Не удалось получить фильтры характеристик, ${error.message}`; });
  }

  const specMap = new Map<number, { id: number; name: string; type: string; values: string[] }>();
  for (const row of specsResult) {
    const specId = Number(row.spec_id);
    let spec = specMap.get(specId);
    if (!spec) {
      spec = { id: specId, name: row.spec_name, type: row.spec_type, values: [] };
      specMap.set(specId, spec);
    }
    spec.values.push(row.value);
  }
  for (const spec of specMap.values()) {
    spec.values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const selectedSpecIdsSet = new Set(selectedSpecificationIds);

  return {
    price: {
      min: Number(priceResult[0]?.min_price ?? 0),
      max: Number(priceResult[0]?.max_price ?? 0),
    },
    specifications: Array.from(specMap.values()).filter(
      (spec) => spec.values.length > 1 || selectedSpecIdsSet.has(spec.id),
    ),
    countries,
    product_types: productTypes,
  };
}
```

### 6.3 `buildFilterConditionGroup` (`src/product/product.service.ts:495-578`)

```typescript
private buildFilterConditionGroup({
  role, categoryIds, search, selectedProductTypes, selectedCountries,
  priceFrom, priceTo, specificationGroups, sortPriceType, exclude,
}: {
  role: string;
  categoryIds: number[];
  search?: string;
  selectedProductTypes: string[];
  selectedCountries: string[];
  priceFrom?: number;
  priceTo?: number;
  specificationGroups: Map<number, string[]>;
  sortPriceType: "MIN" | "MAX";
  exclude?: "price" | "countries" | "product_types" | "specifications";
}): { params: unknown[]; where: string } {
  const params: unknown[] = [];
  const conditions: string[] = [];

  const mainWhere = this.buildMainPageWhere(role).replace(/product\./g, "p.");
  if (mainWhere) conditions.push(mainWhere);

  if (categoryIds.length > 0) {
    params.push(categoryIds);
    conditions.push(`p.category_id = ANY($${params.length}::int[])`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  if (exclude !== "product_types" && selectedProductTypes.length > 0) {
    params.push(selectedProductTypes);
    conditions.push(`p.product_type = ANY($${params.length}::text[])`);
  }

  if (exclude !== "countries" && selectedCountries.length > 0) {
    params.push(selectedCountries);
    conditions.push(`p.country = ANY($${params.length}::text[])`);
  }

  if (exclude !== "price") {
    const priceSubQuery = `(SELECT COALESCE(${sortPriceType}(pp.price), 0) FROM product_price pp WHERE pp.product_id = p.id AND pp.price > 0)`;
    if (priceFrom !== undefined) {
      params.push(priceFrom);
      conditions.push(`${priceSubQuery} >= $${params.length}`);
    }
    if (priceTo !== undefined) {
      params.push(priceTo);
      conditions.push(`${priceSubQuery} <= $${params.length}`);
    }
  }

  if (exclude !== "specifications") {
    for (const [specId, values] of specificationGroups) {
      params.push(specId);
      const specIdIdx = params.length;
      params.push(values);
      const valuesIdx = params.length;
      conditions.push(
        `p.id IN (SELECT ps.product_id FROM product_specification ps WHERE ps.specification_id = $${specIdIdx} AND ps.value = ANY($${valuesIdx}::text[]))`,
      );
    }
  }

  return {
    params,
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}
```

### 6.4 `buildMainPageWhere` (`src/product/product.service.ts:139-162`)

```typescript
private buildMainPageWhere(role: string): string {
  let where = `EXISTS (
    SELECT 1 FROM product_stock stock
    WHERE stock.product_id = product.id
      AND (stock.quantity - stock.reserved > 0 OR stock.in_stock)
  )`;

  if (role === "admin" || role === "moderator" || role === "wholesaler") {
    where += ` AND EXISTS (
      SELECT 1 FROM product_price price
      WHERE price.product_id = product.id AND price.price > 0
    )`;
  } else {
    where += ` AND EXISTS (
      SELECT 1 FROM product_price price
      INNER JOIN price_type type ON type.id = price.price_type_id
      WHERE price.product_id = product.id
        AND price.price > 0
        AND type."isPublic" = true
    )`;
  }

  return where;
}
```

### 6.5 Парсеры (`src/product/product.service.ts:454-493`)

```typescript
private parseFilterList(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(value.split(",").map((item) => item.trim()).filter(Boolean)),
  );
}

private parseSpecificationFilters(value?: string): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  if (!value) return groups;

  for (const pair of value.split(",")) {
    if (!pair) continue;
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;

    const specId = Number.parseInt(pair.substring(0, colonIdx), 10);
    const specValue = pair.substring(colonIdx + 1).trim();
    if (Number.isNaN(specId) || !specValue) continue;

    const existing = groups.get(specId);
    if (existing) existing.push(specValue);
    else groups.set(specId, [specValue]);
  }

  return groups;
}
```

---

## 7. Зависимости и модель данных

| Зависимость | Роль в `getFilters` |
| --- | --- |
| `productRepository` | 4 raw-SQL запроса |
| `categoryService.getCategoryAndAllChildrenIds(id)` | `number[]` — категория и потомки |
| `@CurrentUser()` / `OptionalJwtAuthGuard` | определяет `role` (по умолчанию `user`) |

Используемые таблицы/поля:

| Таблица | Поля |
| --- | --- |
| `product` | `id`, `name`, `description`, `category_id`, `country`, `product_type` |
| `product_stock` | `product_id`, `quantity`, `reserved`, `in_stock` |
| `product_price` | `product_id`, `price`, `price_type_id` |
| `price_type` | `id`, `isPublic` |
| `product_specification` | `product_id`, `specification_id`, `value` |
| `specification` | `id`, `name`, `type` |

---

## 8. Примеры запросов и ответов

Ответы ниже получены с локального бэкенда (`http://localhost:4010`) на
текущих данных — можно использовать как эталон.

### 8.1 Только поиск: характеристики скрыты

```bash
curl "http://localhost:4010/product/filters?search=Ручка"
```

Доступно 7 типов, поэтому `specifications: []`.

```json
{
  "data": {
    "price": { "min": 33, "max": 3600 },
    "specifications": [],
    "countries": ["Китай", "Россия", "Япония"],
    "product_types": [
      "Жаровня-сотейник", "Кастрюля", "Ручка", "Ручка для подарка",
      "Ручка шариковая", "Сковорода универсальная", "Чайник для плиты"
    ]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.2 Поиск + выбранный тип: характеристики появились

```bash
curl "http://localhost:4010/product/filters?search=Ручка&product_types=Кастрюля"
```

Тип однозначен → 5 характеристик по 2 значения. Обратите внимание:
`product_types` по-прежнему содержит все 7 типов — фасет типов не применяет
сам себя.

```json
{
  "data": {
    "price": { "min": 1950, "max": 3600 },
    "specifications": [
      { "id": 89, "name": "Высота", "type": "text", "values": ["23 см", "194 мм"] },
      { "id": 73, "name": "Диаметр", "type": "text", "values": ["28 см", "32 см"] },
      { "id": 74, "name": "Диаметр дна", "type": "text", "values": ["28 см", "320 мм"] },
      { "id": 83, "name": "Материал", "type": "text", "values": ["алюминий пищевой", "Нержавеющая сталь"] },
      { "id": 77, "name": "Материал крышки", "type": "text", "values": ["алюминий", "Термостойкое стекло"] }
    ],
    "countries": ["Китай", "Россия"],
    "product_types": [
      "Жаровня-сотейник", "Кастрюля", "Ручка", "Ручка для подарка",
      "Ручка шариковая", "Сковорода универсальная", "Чайник для плиты"
    ]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.3 + характеристика: остаётся один товар и одна характеристика

```bash
curl "http://localhost:4010/product/filters?search=Ручка&product_types=Кастрюля&specifications=73:28%20см"
```

Выбранная характеристика `73` остаётся видимой с единственным значением
(её можно снять). Остальные характеристики исчезли — у них не осталось
альтернатив.

```json
{
  "data": {
    "price": { "min": 3600, "max": 3600 },
    "specifications": [
      { "id": 73, "name": "Диаметр", "type": "text", "values": ["28 см"] }
    ],
    "countries": ["Китай"],
    "product_types": ["Жаровня-сотейник", "Кастрюля"]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.4 Категория без фильтров

```bash
curl "http://localhost:4010/product/filters?category_id=214"
```

```json
{
  "data": {
    "price": { "min": 33, "max": 95 },
    "specifications": [
      { "id": 68, "name": "Количество", "type": "text", "values": ["1 шт.", "5 шт.", "10 шт."] },
      { "id": 67, "name": "Тип ручки", "type": "text", "values": ["Гелевая", "Капиллярная", "шариковая"] },
      { "id": 30, "name": "Цвет товара", "type": "color", "values": ["Красная", "Синяя", "Черная"] },
      { "id": 72, "name": "Толщина линии", "type": "text", "values": ["0.2 мм", "0.3 мм"] }
    ],
    "countries": ["Китай", "Россия", "Япония"],
    "product_types": ["Ручка"]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.5 Категория + страна

```bash
curl "http://localhost:4010/product/filters?category_id=214&country=Китай"
```

`countries` не сузился — страна не применяет сама себя; цена и
характеристики пересчитаны.

```json
{
  "data": {
    "price": { "min": 44, "max": 77 },
    "specifications": [
      { "id": 67, "name": "Тип ручки", "type": "text", "values": ["Гелевая", "шариковая"] },
      { "id": 30, "name": "Цвет товара", "type": "color", "values": ["Красная", "Черная"] }
    ],
    "countries": ["Китай", "Россия", "Япония"],
    "product_types": ["Ручка"]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.6 Категория + характеристика

```bash
curl "http://localhost:4010/product/filters?category_id=214&specifications=67:Гелевая"
```

```json
{
  "data": {
    "price": { "min": 44, "max": 44 },
    "specifications": [
      { "id": 67, "name": "Тип ручки", "type": "text", "values": ["Гелевая"] }
    ],
    "countries": ["Китай"],
    "product_types": ["Ручка"]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.7 Несколько значений одной характеристики

```bash
curl "http://localhost:4010/product/filters?category_id=214&specifications=67:Гелевая,67:шариковая"
```

Внутри одного `id` работает «ИЛИ»: товар подходит, если имеет любое из
значений. Характеристика `67` активна и остаётся видимой (в ней оба значения),
плюс сохраняется `Цвет товара`, у которого осталось 2 варианта.

```json
{
  "data": {
    "price": { "min": 44, "max": 77 },
    "specifications": [
      { "id": 67, "name": "Тип ручки", "type": "text", "values": ["Гелевая", "шариковая"] },
      { "id": 30, "name": "Цвет товара", "type": "color", "values": ["Красная", "Черная"] }
    ],
    "countries": ["Китай"],
    "product_types": ["Ручка"]
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

### 8.8 Ценовой фильтр без товаров

```bash
curl "http://localhost:4010/product/filters?category_id=214&price_from=10000"
```

Страны, типы и характеристики пусты — товаров в таком диапазоне нет. А цена
осталась `33–95`, потому что фасет цены **не применяет собственный ценовой
фильтр** и показывает реальный диапазон, из которого пользователь сможет
выбрать значение.

```json
{
  "data": {
    "price": { "min": 33, "max": 95 },
    "specifications": [],
    "countries": [],
    "product_types": []
  },
  "status": "success",
  "errors": [],
  "message": "Фильтры получены"
}
```

Полностью пустой каталог (нет ни одного доступного товара) дал бы
`price: {min: 0, max: 0}`.

---

## 9. Тест-кейсы (`src/product/test/product.service.getFilters.spec.ts`)

Тесты используют мок `productRepository.query`, который отвечает на 4 типа
SQL: `AS min_price`, `SELECT DISTINCT p.country`,
`SELECT DISTINCT p.product_type`, `spec_stats`.

| # | Название | Вход | Ожидание |
| --- | --- | --- | --- |
| 1 | не отдаёт характеристики, если типов больше одного и тип не выбран | `role=user`, `search=ручка`; фасет типов вернул `["Ручка","Кастрюля"]` | `specifications: []`; SQL `spec_stats` **не выполнялся** |
| 2 | не отдаёт характеристики, если выбрано больше одного типа | `search=ручка`, `product_types=Ручка,Кастрюля` | `specifications: []`; SQL `spec_stats` **не выполнялся** |
| 3 | отдаёт характеристики только по выбранному типу | `search=ручка`, `product_types=Ручка` | `spec_stats` выполнен; SQL содержит `p.product_type = ANY($2::text[])`; params `["%ручка%", ["Ручка"]]`; ответ — `Тип ручки: ["Гелевая","Шариковая"]` |
| 4 | отдаёт характеристики без выбора типа, если доступен только один тип | `search=ручка`; фасет типов вернул `["Ручка"]` | `spec_stats` выполнен; в SQL **нет** `p.product_type = $`; в ответе 1 характеристика |
| 5 | исключает собственный фильтр из каждого фасета | `search=ручка`, `product_types=Ручка`, `country=Австрия`, `price_from=100`, `price_to=500`, `specifications=67:Гелевая` | См. матрицу ниже |
| 6 | оставляет активную характеристику с одним значением и скрывает остальные | `search=ручка`, `specifications=67:Гелевая`; в моке `67` с одним значением и `99` с одним значением | SQL содержит `OR s.id = ANY($`; params `["%ручка%", 67, ["Гелевая"], [67]]`; в ответе только `67` |

### 9.1 Матрица проверок кейса 5

| SQL | Содержит | Не содержит |
| --- | --- | --- |
| `AS min_price` (цена) | `p.country = ANY`, `p.product_type = ANY`, `ps.specification_id = $` | `>= $` (своя цена исключена) |
| `SELECT DISTINCT p.country` | `p.product_type = ANY`, `ps.specification_id = $` | `p.country = ANY` |
| `SELECT DISTINCT p.product_type` | `p.country = ANY` | `p.product_type = ANY` |
| `spec_stats` (характеристики) | `ps.specification_id = $`, `p.country = ANY`, `p.product_type = ANY` | — |

Ожидаемые params запроса характеристик:

```json
["%ручка%", ["Ручка"], ["Австрия"], 100, 500, 67, ["Гелевая"], [67]]
```

> Порядок params: сначала все условия из `buildFilterConditionGroup`
> (поиск → тип → страна → цена → характеристики), затем `selectedSpecificationIds`
> для `HAVING`/`ORDER BY`.

### 9.2 Запуск

```bash
npx jest src/product/test/product.service.getFilters.spec.ts
```

На момент написания: **6/6 passed**.

---

## 10. Ограничения и подводные камни

1. **`LIMIT 5` действует и на активные характеристики.** Если активных
   характеристик больше 5, часть из них может не попасть в ответ, несмотря
   на приоритет в `ORDER BY`.
2. **Значения сравниваются строкой** (`ps.value = ANY`), без нормализации
   регистра/пробелов: `Гелевая` ≠ `гелевая`.
3. **Поиск по описанию** может давать неожиданные типы товаров — это
   следствие `ILIKE` по `description`.
4. **`category_id` не валидируется** отдельно: `Number(...)` от мусора даст
   `NaN`, и запрос в дерево категорий может не найти ничего.
5. **Пустой результат** отдаётся как `price: {min:0,max:0}` и пустые
   массивы, а не как `null`.
6. **Роль влияет только на цену и видимость товара**, но не на набор
   характеристик/стран/типов.
