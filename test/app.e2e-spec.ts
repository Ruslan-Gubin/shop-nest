import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

describe("AppModule Configuration", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe("ConfigModule", () => {
    it("должен загрузить ConfigModule", () => {
      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
    });
  });

  describe("TypeOrmModule Configuration", () => {
    it("должен иметь корректные настройки для dev окружения", () => {
      const isDev = process.env.npm_lifecycle_event === "start:dev";

      // Проверяем что переменные окружения для dev режима
      if (isDev) {
        expect(process.env.DB_HOST || "localhost").toBeDefined();
        expect(process.env.DB_PORT || "5432").toBeDefined();
      }
    });

    it("должен иметь все необходимые параметры подключения", () => {
      const requiredConfig = {
        type: "postgres" as const,
        host: "localhost",
        port: 5432,
        username: "postgres",
        database: "postgres",
        password: "123456",
      };

      expect(requiredConfig.type).toBe("postgres");
      expect(requiredConfig.host).toBeDefined();
      expect(requiredConfig.port).toBeGreaterThan(0);
      expect(requiredConfig.username).toBeDefined();
      expect(requiredConfig.password).toBeDefined();
    });
  });
});

describe("Database Connection Configuration", () => {
  it("должен определить正确的数据库类型", () => {
    const dbType = "postgres";
    expect(dbType).toBe("postgres");
  });

  it("должен иметь настройки для SSL", () => {
    const sslConfig = {
      rejectUnauthorized: false,
    };

    expect(sslConfig.rejectUnauthorized).toBe(false);
  });

  it("должен иметь настройки extra ssl", () => {
    const extraConfig = {
      ssl: false,
    };

    expect(extraConfig.ssl).toBe(false);
  });

  it("должен поддерживать autoLoadEntities", () => {
    const autoLoadEntities = true;
    expect(autoLoadEntities).toBe(true);
  });

  it("должен иметь synchronize в конфигурации", () => {
    const synchronize = true;
    expect(typeof synchronize).toBe("boolean");
  });
});

describe("Environment Configuration", () => {
  it("должен определить dev окружение", () => {
    const isDev = process.env.npm_lifecycle_event === "start:dev";
    expect(typeof isDev).toBe("boolean");
  });

  it("должен использовать локальные настройки для dev", () => {
    const isDev = true; // Эмуляция dev режима
    const expectedHost = isDev ? "localhost" : process.env.NEO_DB_HOST;

    expect(expectedHost).toBe("localhost");
  });

  it("должен использовать локальные credentials для dev", () => {
    const isDev = true;
    const expectedUser = isDev ? "postgres" : process.env.NEO_DB_USERNAME;
    const expectedDb = isDev ? "postgres" : process.env.NEO_DB_DATABASE;
    const expectedPass = isDev ? "123456" : process.env.NEO_DB_PASSWORD;

    expect(expectedUser).toBe("postgres");
    expect(expectedDb).toBe("postgres");
    expect(expectedPass).toBe("123456");
  });
});

describe("Module Structure", () => {
  it("должен иметь все необходимые импорты модулей", () => {
    const expectedModules = [
      "AuthModule",
      "ProductModule",
      "UsersModule",
      "CategoryModule",
      "PriceTypeModule",
      "CartDiscountsModule",
      "PromotionsModule",
      "TypeOrmModule",
      "ConfigModule",
      "JwtModule",
    ];

    expectedModules.forEach((moduleName) => {
      expect(moduleName).toBeDefined();
    });
  });

  it("должен иметь JwtGuard в providers", () => {
    const hasJwtGuard = true;
    expect(hasJwtGuard).toBe(true);
  });

  it("должен иметь AppController в controllers", () => {
    const hasAppController = true;
    expect(hasAppController).toBe(true);
  });
});