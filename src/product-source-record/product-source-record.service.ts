import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpenCodeService } from "src/opencode/opencode.service";
import { BrowserManagerService } from "src/browser-manager/browser-manager.service";
import { ProductSourceRecord } from "./entities/product-source-record.entity";
import { ProductService } from "src/product/product.service";
import * as cheerio from "cheerio";
import { CheckImportItemDto } from "./dto/check-import-items.dto";

@Injectable()
export class ProductSourceRecordService {
  constructor(
    @InjectRepository(ProductSourceRecord)
    private readonly productSourceRecordRepository: Repository<ProductSourceRecord>,
    private readonly productService: ProductService,
    private readonly openCode: OpenCodeService,
    private readonly browserManager: BrowserManagerService,
  ) {}

  async checkImportItems(
    items: CheckImportItemDto[],
  ): Promise<
    Record<number, { status: "empty" | "error" | "record" | "completed"; error_message: string }>
  > {
    const result: Record<
      number,
      { status: "empty" | "error" | "record" | "completed"; error_message: string }
    > = {};

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const value = (item.barcode || item.name).trim();

      if (!value) {
        result[item.id] = { status: "error", error_message: "Нет названия и штрих-кода" };
        continue;
      }

      const record = await this.productSourceRecordRepository.findOne({
        where: { value },
      });

      if (!record) {
        result[item.id] = { status: "empty", error_message: "" };
        continue;
      }

      if (record.error_message) {
        result[item.id] = { status: "error", error_message: record.error_message };
        continue;
      }

      if (!record.product) {
        result[item.id] = { status: "error", error_message: "Нет полного описания" };
        continue;
      }

      const product = await this.productService.findByCode(item.barcode);

      result[item.id] = {
        status: product ? "completed" : "record",
        error_message: "",
      };
    }

    return result;
  }

  async search(name: string, code: string) {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      throw "Укажите штрих-код";
    }

    if (!/^\d{8,14}$/.test(trimmedCode)) {
      throw "Некорректный штрих-код. Для товаров без кода заполните данные вручную";
    }

    const existing = await this.findRecord(trimmedCode);

    const source_names = existing?.source_names || [];
    let clear_name = existing?.clear_name || "";
    let product = existing?.product || null;
    let error_message = existing?.error_message || "";

    if (!existing) {
      const result = await this.findAndFormattedProductName(trimmedName, trimmedCode);

      if (result.source_names.length > 0) {
        source_names.push(...result.source_names);
      }

      if (result.clear_name.length > 0) {
        clear_name = result.clear_name;
      }

      if (result.error.length > 0) {
        error_message = result.error;
      }
    }

    if (!clear_name) {
      error_message = "Не удалось сформировать название для товара";
    }

    const validProductOptions =
      product !== null &&
      (Object.hasOwn(product, "name") ||
        Object.hasOwn(product, "code") ||
        Object.hasOwn(product, "description"));

    if (!validProductOptions) {
      const productInfo = await this.getProductInfo(clear_name, trimmedCode);
      const productOptions = await this.getProductOptions(clear_name, productInfo, trimmedCode);

      const validOptions =
        productOptions &&
        !Object.hasOwn(productOptions, "error") &&
        (Object.hasOwn(productOptions, "name") ||
          Object.hasOwn(productOptions, "code") ||
          Object.hasOwn(productOptions, "description"));

      const hasError =
        productOptions &&
        Object.hasOwn(productOptions, "error") &&
        typeof productOptions.error === "string";

      if (validOptions) {
        product = productOptions;
      } else if (hasError) error_message += productOptions.error;
    }

    if (clear_name && product) {
      error_message = "";
    }

    if (!existing) {
      await this.saveRecord(trimmedCode, source_names, clear_name, error_message, product);
    }

    if (existing && existing.error_message !== error_message) {
      await this.productSourceRecordRepository.update(existing.id, { error_message });
    }

    if (existing && !existing.product && product) {
      await this.productSourceRecordRepository.update(existing.id, { product, error_message: "" });
    }

    return { clear_name, product, error_message };
  }

  async fetchWithPlaywright(url: string) {
    const context = await this.browserManager.newContext();
    const page = await context.newPage();

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const photos: string[] = [];

    page.on("response", (res) => {
      const url = res.url();
      if (!url.match(/\.(jpg|jpeg|png|webp|avif)/i)) return;
      const contentType = res.headers()["content-type"] || "";
      if (contentType.includes("image")) photos.push(url);
    });

    try {
      await page.goto(url, { waitUntil: "load" });

      await page.evaluate(() => {
        const total = document.body.scrollHeight;
        const step = 300;
        let scrolled = 0;

        const interval = setInterval(
          () => {
            scrolled += step;
            window.scrollTo(0, scrolled);
            if (scrolled >= total) clearInterval(interval);
          },
          200 + Math.random() * 400,
        );
      });

      await sleep(2000 + Math.random() * 3000);

      const text = await page.evaluate(() => document.body?.innerText || "");

      return { text, photos };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async asyncPool<T>(
    concurrency: number,
    items: T[],
    fn: (item: T) => Promise<void>,
  ): Promise<void> {
    const executing = new Set<Promise<void>>();
    for (const item of items) {
      const promise = fn(item).finally(() => executing.delete(promise));
      executing.add(promise);
      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);
  }

  async getProductInfo(name: string, barcode?: string) {
    const query = `купить - ${name ? "Название товара " + name + "," : ""} ${barcode ? "Штрих-код:" + barcode : ""}`;
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=10`;

    const urls: string[] = [];

    try {
      const response = await fetch(searchUrl);
      const html = await response.text();

      const $ = cheerio.load(html);

      $("a.result__a").each((i, element) => {
        if (i >= 10) return false;
        const link = $(element).attr("href");
        const urlObj = new URL(`https:${link}`);
        const encoded = urlObj.searchParams.get("uddg");

        if (encoded) {
          const decodedUrl = decodeURIComponent(encoded);
          urls.push(decodedUrl);
        }
      });

      const data: { url: string; data: any; error: string; photos: string[] }[] = [];

      await this.asyncPool(2, urls, async (url) => {
        try {
          const { text, photos } = await this.fetchWithPlaywright(url);
          const clean = text.replace(/\s+/g, " ").trim();
          if (clean.length > 0) {
            data.push({ url, data: clean, error: "", photos });
          }
        } catch (error) {
          data.push({ url, data: "", error: `playwright: ${error}`, photos: [] });
        }
      });

      return data;
    } catch (error) {
      throw `Ошибка при поиске списка: ${error}`;
    }
  }

  async findAndFormattedProductName(name: string, code: string) {
    const source_names: string[] = [];

    await this.getEanNames(code, source_names);
    await this.getDisaiNames(code, source_names);
    await this.getBarcodeNames(code, source_names);
    await this.getYandexNames(code, source_names);

    if (name.length > 0 && source_names.length === 0) {
      await this.formattedName(name, source_names);
    }

    if (source_names.length === 0) {
      throw "По данному штрих-коду не удалось найти название товара. Укажите другое название товара или измените название";
    }

    let clear_name = "";
    let error = "";

    const generateName = await this.determineName(source_names);

    if (generateName && generateName.name.length > 0) {
      clear_name = generateName.name;
    }

    if (generateName && generateName.error.length > 0) {
      error = generateName.error;
    }

    return { source_names, clear_name, error };
  }

  async getEanNames(code: string, names: string[]) {
    const response = await fetch("https://ean-online.ru/match.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://ean-online.ru/",
        "User-Agent": "Mozilla/5.0 ...",
      },
      body: `barcode=${code}`,
    });

    const name = await response.text();

    if (name) {
      names.push(name);
    }
  }

  async getDisaiNames(code: string, names: string[]) {
    const response = await fetch(`https://ru.disai.org/?search_query=${code}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $("tr[bgcolor='#e0e8f2']").each((_, row) => {
      const items: string[] = [];

      $(row)
        .find("td:first-child font")
        .contents()
        .each((_, node) => {
          if (node.type === "text") {
            const text = $(node).text().trim();
            if (text) items.push(text);
          }
        });

      items.forEach((name) => {
        names.push(name);
      });
    });
  }

  async getBarcodeNames(barcode: string, names: string[]) {
    const response = await fetch(
      `https://barcode-list.ru/barcode/RU/Поиск.htm?barcode=${barcode}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    const html = await response.text();
    const $ = cheerio.load(html);

    $("table.randomBarcodes tr.even, table.randomBarcodes tr.odd").each((_, row) => {
      const name = $(row).find("td:nth-child(3)").text().trim();
      if (name) {
        names.push(name);
      }
    });
  }

  async getYandexNames(code: string, names: string[]) {
    const response = await fetch(`https://market.yandex.ru/search?text=${code}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      const json = JSON.parse($(el).html() ?? "");
      if (json.itemListElement) {
        json.itemListElement.forEach((item: any) => {
          const name = item.item?.name?.trim();
          if (name) {
            names.push(name);
          }
        });
      }
    });
  }

  async determineName(names: string[]): Promise<{ name: string; error: string }> {
    if (names.length === 0) return { name: "", error: "Нет названий для товара" };

    const validAnswer = `"{ "name": "Название товара", "error": "если не удалось сформировать название - Ошибка: причина коротко" }"`;

    const prompt = `
Есть список названий товара из разных источников: ${JSON.stringify(names)}
Приведи к единственному нормально отформатированному чистому названию для интернет-магазина.
Удали лишнее, приведи к нормальному регистру и проверь орфографию.
Верни JSON в виде ${validAnswer},
если каким-то образом не получилось извлечь из списка корректное название тогда возвращай ${validAnswer} в error коротко опиши причину.

Правила ответа:
- Верни ТОЛЬКО JSON в виде ${validAnswer}
- Никаких кавычек, префиксов, пояснений, списков, нумерации
- Если невозможно определить единое название — ответь ровно JSON в виде ${validAnswer}
- Если названия противоречивые или невозможно определить — JSON в виде ${validAnswer}
- Не предлагай варианты, не задавай вопросы
- Важно ответ должен быть JSON в виде ${validAnswer} второго варианта не должно быть

Примеры:
Вход: ["лампа светодиодная in home 30W 4000K", "IN HOME LED 30W 4000K E27"] 
Ответ: "{"name":"Лампа светодиодная IN HOME 30Вт 4000K E27", "error": ""}"

Вход: [""]
Ответ: "{"name":"", "error": "Ошибка: нет названий для товара"}"
`;

    const answer = await this.openCode.query(prompt);
    const match = answer.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : null;

    return {
      name: json && Object.hasOwn(json, "name") ? json?.name : "",
      error:
        json && Object.hasOwn(json, "error")
          ? json.error
          : json && !Object.hasOwn(json, "name")
            ? "Не удалось сгенерировать название для товара"
            : "",
    };

    // return await this.openCode.query(prompt);
  }

  async formattedName(name: string, names: string[]) {
    if (name.length === 0) return "";

    const prompt = `
Есть произвольное название товара: ${name}
Приведи название к нормально отформатированному чистому названию для интернет-магазина.
Удали лишнее, приведи к нормальному регистру и проверь орфографию.
Верни только JSON в виде "{ "name": "отформатированное название" }", без пояснений и раздумий, без JSON ответ не корректный
если каким-то образом не получилось составить корректное название тогда возвращай JSON в виде "{ "name": "" }".

Правила ответа:
- Верни ТОЛЬКО один JSON — "{ "name": "отформатированное название" }"
- Никаких кавычек, префиксов, пояснений, списков, нумерации
- Если невозможно определить название для товара — ответь JSON "{ "name": "" }"
- Если названия противоречивые или невозможно определить — JSON "{ "name": "" }"
- Не предлагай варианты, не задавай вопросы
- Важно ответ должен быть с JSON без JSON ответ не корректный

Примеры:
Вход: "E27 лампа светодиодная in home 30W 4000K" 
Ответ: "{ "name": "Лампа светодиодная IN HOME 30Вт 4000K E27" }"

Вход: [""]
Ответ: "{ "name": "" }"
`;

    const answer = await this.openCode.query(prompt);

    const match = answer.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : null;

    const resultName = json ? json?.name : "";

    if (resultName.length > 0) {
      names.push(resultName);
    }

    return resultName;
  }

  async findRecord(value: string) {
    return this.productSourceRecordRepository
      .findOne({
        where: { value },
      })
      .catch((error) => {
        throw `Не удалось получить запись ${error}`;
      });
  }

  async saveRecord(
    value: string,
    source_names: string[],
    clear_name: string,
    error_message: string,
    product?: object | null,
  ) {
    return this.productSourceRecordRepository.save({
      value,
      source_names,
      clear_name,
      product,
      error_message,
    });
  }

  async getProductOptions(
    name: string,
    productInfo: { url: string; data: any; error: string; photos: string[] }[],
    barcode: string,
  ): Promise<{ error?: string; name?: string; code?: string } | null> {
    const allPhotos = [...new Set(productInfo.flatMap((p) => p.photos))].filter((url) => {
      if (url.includes("abt-challenge")) return false;
      if (url.includes("yastatic.net") || url.includes("favicon")) return false;
      if (url.includes("spritesheet") || url.includes("specials-bg") || url.includes("xarus-logo"))
        return false;
      if (url.includes("replain.cc") || url.includes("404")) return false;
      if (url.includes("imgtmb") || url.includes("countries_flags")) return false;
      if (url.match(/\/\d{1,2}x\d{1,2}\//)) return false;
      if (url.match(/\/60_60_/)) return false;
      return true;
    });

    const formattedInfo =
      productInfo
        .map((p, i) => {
          let text = `\n=== Источник ${i + 1}: ${p.url} ===\n`;
          if (p.error) text += `Ошибка: ${p.error}\n`;
          if (p.data) {
            const clean = p.data.replace(/\s+/g, " ").trim();
            text += clean.substring(0, 5000);
          }
          return text;
        })
        .join("\n\n") +
      `\n\n=== ФОТОГРАФИИ ТОВАРА (предварительно отфильтрованы) ===\n` +
      allPhotos.join("\n");

    const prompt = `Товар с названием "${name}", 
    И то что удалось извлечь из интернета (все данные по этому товару) - ${formattedInfo}
    Ты — менеджер по продажам в крупной компании. Твоя задача — дать официальное, формализованное описание товара.
    Твоя задача извлечь структурированных полей и  дать официальное, формализованное описание товара, исходя из информации составить json такого вида -
    {
      "description": "Описание товара (5-6 предложений, официальный стиль, с деталями и нюансами)" или null,
      "product_type": "Вид товара (например \"Кукла-пупс\", \"Тетрадь\")" или null,
      "equipment": "Комплектация (что входит в набор)" или null,
      "brand_name": "Бренд" или null,
      "name": название товара,
      "code": штриховой код товара - ${barcode},
      "category_name": "Полный путь до листовой категории (например \"Игрушки / Куклы / Кукла-пупс\" или \"Посуда / Чайники / Эмалированные чайники\")",
      "specifications": [
        { "name": "Название характеристики", "value": "Значение" }
      ] или null,
      "weight": число (вес в граммах) или null,
      "height": число (высота в см) или null,
      "length": число (длина в см) или null,
      "width": число (ширина в см) или null,
      "country": "Страна производства" или null,
      "seo": {
        "seo_title": "Meta-заголовок (до 60 символов, с ключевыми словами)",
        "seo_description": "Meta-описание (до 160 символов, с ключевыми словами)",
        "slug": "ЧПУ-строка (транслит, только латиница, дефисы вместо пробелов, без спецсимволов)",
        "og_title": "Open Graph заголовок (до 60 символов)",
        "og_description": "Open Graph описание (до 160 символов)",
        "og_type": "Тип Open Graph (обычно 'product')",
        "keywords": "Ключевые слова через запятую (5-10 слов)"
      } или null,
      "photos": [] массив ссылок на фото товара (желательно без иконок, логотипов, баннеров, фонов, аватаров отзывов)
    }
    ВАЖНО:
    - В поле "photos" укажи ТОЛЬКО ссылки
    - верни ТОЛЬКО JSON без пояснений
    - В результирующем JSON должна быть информация переданная по этому товару, выдуманной информации не должно быть, 
    - Не добавляй что ли бо от себя и не выдумывай если описание тебе показалось не корректным
    - Только информация о товаре, не надо объяснять что либо спрашивать или советоваться, если по какому либо полю нет данных просто ставь null
    Пример ответа: "{
      "name": "Mary Poppins кукла Полли «Милый болтун», 33см, озвучка",
      "code": ${barcode},
      "description": "Очаровательный пупс Полли из коллекции Mary Poppins. Высота 33 см, мягконабивное тело с твёрдыми ручками и ножками. Кукла издаёт 5 реалистичных звуков: плачет, хохочет, лепечет, агукает и говорит «папа».",
      "product_type": "Кукла-пупс",
      "equipment": "Кукла, бутылочка-поильник, 3 батарейки AG13, шапочка",
      "brand_name": "Mary Poppins",
      "category_name": "Игрушки / Куклы / Кукла-пупс",
      "country": "Китай",
      "weight": 580,
      "height": 33,
      "length": null,
      "width": null,
      "specifications": [
        { "name": "Материал", "value": "ПВХ, пластик, текстильные материалы" },
        { "name": "Тип тела", "value": "Мягконабивное" },
        { "name": "Звуковые эффекты", "value": "5 звуков" },
        { "name": "Питание", "value": "3×AG13/LR44" },
        { "name": "Возраст", "value": "от 3 лет" },
        { "name": "Артикул", "value": "451193" }
      ],
      "photos": [
        "https://polesie-toys.com/upload/iblock/451193/box.jpg",
        "https://polesie-toys.com/upload/iblock/451193/doll_1.jpg",
        "https://polesie-toys.com/upload/iblock/451193/doll_2.jpg",
        "https://ozon.ru/photos/451193_1.jpg",
        "https://ozon.ru/photos/451193_2.jpg"
      ],
      "seo": {
        "seo_title": "Кукла Mary Poppins Полли «Милый болтун» 33см озвучка",
        "seo_description": "Пупс Mary Poppins Полли 33 см с 5 звуками. Мягконабивное тело, съёмная одежда. Игрушка для детей от 3 лет.",
        "slug": "kukla-mary-poppins-polli-milyj-boltun-33sm-ozvuchka",
        "og_title": "Кукла Mary Poppins Полли «Милый болтун» 33см",
        "og_description": "Очаровательный пупс Полли из коллекции Mary Poppins. Высота 33 см, 5 реалистичных звуков.",
        "og_type": "product",
        "keywords": "Mary Poppins, кукла, Полли, милый болтун, пупс, озвучка, 33см, детские игрушки"
      }
    }"
    Правила ответа:
    - Если данных для поля нет — ставь null.
    - Не придумывай от себя ничего, чего нет в описании.
    - Верни ТОЛЬКО JSON — полноценное описание
    - Никаких кавычек, префиксов, пояснений, списков, нумерации
    - Если невозможно определить описание товара по каким либо причинам — ответь JSON "{"error": "Ошибка: ( причина коротко )"}"
    - Если описания противоречивые или невозможно определить общее описание — верни: JSON "{"error": "Ошибка: ( причина коротко )"}"
    - Не предлагай варианты, не задавай вопросы, не фантазируй
    - Важно ответ должен быть или JSON товара или ответь JSON "{"error": "Ошибка: ( причина коротко )"}", третьего варианта не должно быть
    - всякого рода кавычек и приписок по типу json мне не нужны, желательно структуру JSON в противном ответь JSON "{"error": "Ошибка: ( причина коротко )"}"
    - если источники содержат разную информацию по разным товарам попробуй найти более подходящий источник для названия ${name} или штрих-кода: ${barcode} или же найди какое либо сходство из разных источников и составь минимальное описание, если нет определенного бренда или габариты не сопоставляются из разных источников тогда необязательно это указывать пусть буде null
`;

    const answer = await this.openCode.query(prompt);
    const match = answer.match(/\{[\s\S]*\}/);

    return match ? JSON.parse(match[0]) : null;
  }
}
