import type { Repository } from "typeorm";
import { ProductService } from "../product.service";
import type { Product } from "../entities/product.entity";

type QueryMock = jest.Mock<Promise<unknown[]>, [string, unknown[]?]>;

const createService = (query: QueryMock) =>
  new ProductService(
    { query } as unknown as Repository<Product>,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

const createQueryMock = ({
  productTypes,
  specifications = [],
}: {
  productTypes: string[];
  specifications?: {
    spec_id: number;
    spec_name: string;
    spec_type: string;
    value: string;
  }[];
}) =>
  jest.fn(async (sql: string) => {
    if (sql.includes("AS min_price")) {
      return [{ min_price: 0, max_price: 0 }];
    }

    if (sql.includes("SELECT DISTINCT p.country")) {
      return [];
    }

    if (sql.includes("SELECT DISTINCT p.product_type")) {
      return productTypes.map((product_type) => ({ product_type }));
    }

    if (sql.includes("spec_stats")) {
      return specifications;
    }

    return [];
  }) as QueryMock;

const specificationRows = [
  {
    spec_id: 67,
    spec_name: "Тип ручки",
    spec_type: "text",
    value: "Гелевая",
  },
  {
    spec_id: 67,
    spec_name: "Тип ручки",
    spec_type: "text",
    value: "Шариковая",
  },
];

describe("ProductService.getFilters", () => {
  it("не отдаёт характеристики, если типов больше одного и тип не выбран", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка", "Кастрюля"],
      specifications: specificationRows,
    });
    const service = createService(query);

    const filters = await service.getFilters({
      role: "user",
      search: "ручка",
    });

    expect(filters.specifications).toEqual([]);
    expect(query.mock.calls.some(([sql]) => sql.includes("spec_stats"))).toBe(false);
  });

  it("не отдаёт характеристики, если выбрано больше одного типа", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка", "Кастрюля"],
      specifications: specificationRows,
    });
    const service = createService(query);

    const filters = await service.getFilters({
      role: "user",
      search: "ручка",
      product_types: "Ручка,Кастрюля",
    });

    expect(filters.specifications).toEqual([]);
    expect(query.mock.calls.some(([sql]) => sql.includes("spec_stats"))).toBe(false);
  });

  it("отдаёт характеристики только по выбранному типу", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка", "Кастрюля"],
      specifications: specificationRows,
    });
    const service = createService(query);

    const filters = await service.getFilters({
      role: "user",
      search: "ручка",
      product_types: "Ручка",
    });

    const specsCall = query.mock.calls.find(([sql]) => sql.includes("spec_stats"));

    expect(specsCall).toBeDefined();
    expect(specsCall?.[0]).toContain("p.product_type = ANY($2::text[])");
    expect(specsCall?.[1]).toEqual(["%ручка%", ["Ручка"]]);
    expect(filters.specifications).toEqual([
      {
        id: 67,
        name: "Тип ручки",
        type: "text",
        values: ["Гелевая", "Шариковая"],
      },
    ]);
  });

  it("отдаёт характеристики без выбора типа, если доступен только один тип", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка"],
      specifications: specificationRows,
    });
    const service = createService(query);

    const filters = await service.getFilters({
      role: "user",
      search: "ручка",
    });

    const specsCall = query.mock.calls.find(([sql]) => sql.includes("spec_stats"));

    expect(specsCall).toBeDefined();
    expect(specsCall?.[0]).not.toContain("p.product_type = $");
    expect(filters.specifications).toHaveLength(1);
  });

  it("исключает собственный фильтр из каждого фасета", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка", "Кастрюля"],
      specifications: specificationRows,
    });
    const service = createService(query);

    await service.getFilters({
      role: "user",
      search: "ручка",
      product_types: "Ручка",
      country: "Австрия",
      price_from: "100",
      price_to: "500",
      specifications: "67:Гелевая",
    });

    const findSql = (needle: string) =>
      query.mock.calls.find(([sql]) => sql.includes(needle))?.[0] ?? "";

    const priceSql = findSql("AS min_price");
    expect(priceSql).toContain("p.country = ANY");
    expect(priceSql).toContain("p.product_type = ANY");
    expect(priceSql).toContain("ps.specification_id = $");
    expect(priceSql).not.toContain(">= $");

    const countriesSql = findSql("SELECT DISTINCT p.country");
    expect(countriesSql).not.toContain("p.country = ANY");
    expect(countriesSql).toContain("p.product_type = ANY");
    expect(countriesSql).toContain("ps.specification_id = $");

    const typesSql = findSql("SELECT DISTINCT p.product_type");
    expect(typesSql).not.toContain("p.product_type = ANY");
    expect(typesSql).toContain("p.country = ANY");

    const specsSql = findSql("spec_stats");
    expect(specsSql).toContain("ps.specification_id = $");
    expect(specsSql).toContain("p.country = ANY");
    expect(specsSql).toContain("p.product_type = ANY");

    const specsCall = query.mock.calls.find(([sql]) => sql.includes("spec_stats"));

    expect(specsCall?.[1]).toEqual([
      "%ручка%",
      ["Ручка"],
      ["Австрия"],
      100,
      500,
      67,
      ["Гелевая"],
      [67],
    ]);
  });

  it("оставляет активную характеристику с одним значением и скрывает остальные", async () => {
    const query = createQueryMock({
      productTypes: ["Ручка"],
      specifications: [
        {
          spec_id: 67,
          spec_name: "Тип ручки",
          spec_type: "text",
          value: "Гелевая",
        },
        {
          spec_id: 99,
          spec_name: "Материал",
          spec_type: "text",
          value: "Пластик",
        },
      ],
    });
    const service = createService(query);

    const filters = await service.getFilters({
      role: "user",
      search: "ручка",
      specifications: "67:Гелевая",
    });

    const specsCall = query.mock.calls.find(([sql]) => sql.includes("spec_stats"));

    expect(specsCall?.[0]).toContain("OR s.id = ANY($");
    expect(specsCall?.[1]).toEqual(["%ручка%", 67, ["Гелевая"], [67]]);
    expect(filters.specifications).toEqual([
      {
        id: 67,
        name: "Тип ручки",
        type: "text",
        values: ["Гелевая"],
      },
    ]);
  });
});
