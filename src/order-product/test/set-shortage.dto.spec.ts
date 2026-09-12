import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SetShortageDto } from "../dto/set-shortage.dto";

// ─── Валидация тела запроса PATCH /orders/shortage/:id ─────
//
// Тело: { items: SetShortageItemDto[] }
// Правила (по факту DTO, src/order-product/dto/set-shortage.dto.ts):
//   - items обязателен, не пустой, без дублей по stock_id
//   - id — положительное число
//   - quantity — число >= 0
//   - warehouse_id — обязательное положительное число
//   - stock_id — необязательное положительное число

describe("SetShortageDto", () => {
  const validItem = { id: 10, stock_id: 1, warehouse_id: 1, quantity: 5 };

  const validateDto = async (body: unknown) => {
    const dto = plainToInstance(SetShortageDto, body);
    return validate(dto);
  };

  const collectConstraints = async (body: unknown) => {
    const errors = await validateDto(body);
    return {
      top: errors.flatMap((e) => Object.keys(e.constraints || {})),
      nested: errors.flatMap((e) =>
        (e.children || []).flatMap((c) =>
          (c.children || []).flatMap((cc) => Object.keys(cc.constraints || {})),
        ),
      ),
    };
  };

  it("валидный items → без ошибок", async () => {
    const errors = await validateDto({ items: [validItem] });
    expect(errors).toHaveLength(0);
  });

  it("items отсутствует → ошибка IsArray", async () => {
    const { top } = await collectConstraints({});
    expect(top).toContain("isArray");
  });

  it("items пустой массив → ошибка ArrayNotEmpty", async () => {
    const { top } = await collectConstraints({ items: [] });
    expect(top).toContain("arrayNotEmpty");
  });

  it("items не массив → ошибка IsArray", async () => {
    const { top } = await collectConstraints({ items: "не массив" });
    expect(top).toContain("isArray");
  });

  it("quantity отрицательное → ошибка", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, quantity: -1 }],
    });
    expect(nested).toContain("min");
  });

  it("quantity не число → ошибка", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, quantity: "пять" }],
    });
    expect(nested).toContain("isInt");
  });

  it("quantity дробное (5.5) → ошибка IsInt", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, quantity: 5.5 }],
    });
    expect(nested).toContain("isInt");
  });

  it("stock_id отрицательный → ошибка Min", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, stock_id: -1 }],
    });
    expect(nested).toContain("min");
  });

  it("дубль id с разными stock_id → валиден (ArrayUnique идёт по stock_id)", async () => {
    const errors = await validateDto({
      items: [validItem, { ...validItem, id: 20, stock_id: 2 }],
    });
    expect(errors).toHaveLength(0);
  });

  it("id = 0 → ошибка", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, id: 0 }],
    });
    expect(nested).toContain("min");
  });

  it("warehouse_id отсутствует → ошибка", async () => {
    const { nested } = await collectConstraints({
      items: [{ ...validItem, warehouse_id: undefined }],
    });
    expect(nested).toContain("isInt");
  });

  it("stock_id необязателен → без ошибок", async () => {
    const { id, quantity, warehouse_id } = validItem;
    const errors = await validateDto({ items: [{ id, quantity, warehouse_id }] });
    expect(errors).toHaveLength(0);
  });

  it("дубли stock_id в items → ошибка ArrayUnique", async () => {
    const { top } = await collectConstraints({
      items: [validItem, { ...validItem, id: 20 }],
    });
    expect(top).toContain("arrayUnique");
  });
});