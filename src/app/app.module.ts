import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { JwtGuard } from "src/auth/guards/jwt.guard";
import { ProductModule } from "src/product/product.module";
import { UsersModule } from "src/users/users.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CategoryModule } from "src/category/category.module";
import { PriceTypeModule } from "src/price-type/price-type.module";
import { CartDiscountsModule } from "src/cart-discounts/cart-discounts.module";
import { PromotionsModule } from "src/promotions/promotions.module";
import { PriceFillModule } from "src/price-fill/price-fill.module";
import { PriceRangeModule } from "src/price-range/price-range.module";
import { ProductPriceModule } from "src/product-price/product-price.module";
import { SpecificationsModule } from "src/specifications/specifications.module";
import { ProductSpecificationModule } from "src/product-specification/product-specification.module";
import { WarehouseModule } from "src/warehouse/warehouse.module";
import { ProductStockModule } from "src/product-stock/product-stock.module";
import { OrdersModule } from "src/orders/orders.module";
import { OrderProductModule } from "src/order-product/order-product.module";
import { SearchModule } from "src/search/search.module";
import { AddressModule } from "src/address/address.module";
import { ProductReviewModule } from "src/product-review/product-review.module";

const isDev = process.env.npm_lifecycle_event === "start:dev";

@Module({
	imports: [
		JwtModule.register({}),
		AuthModule,
		ProductModule,
		UsersModule,
		CategoryModule,
		PriceTypeModule,
		CartDiscountsModule,
		PromotionsModule,
		PriceFillModule,
		PriceRangeModule,
		ProductPriceModule,
		SpecificationsModule,
		ProductSpecificationModule,
		WarehouseModule,
		ProductStockModule,
		OrdersModule,
		OrderProductModule,
		SearchModule,
		AddressModule,
		ProductReviewModule,
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				entities: [],
				host: isDev ? "localhost" : configService.get<string>("NEO_DB_HOST"),
				port: isDev ? 5432 : configService.get("NEO_DB_PORT"),
				username: isDev
					? "postgres"
					: configService.get<string>("NEO_DB_USERNAME"),
				database: isDev
					? "postgres"
					: configService.get<string>("NEO_DB_DATABASE"),
				password: isDev
					? "123456"
					: configService.get<string>("NEO_DB_PASSWORD"),
				autoLoadEntities: true,
				synchronize: true, //remove production
				ssl: {
					rejectUnauthorized: false,
				},
				extra: {
					ssl: false,
				},
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [AppController],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtGuard,
		},
		AppService,
	],
})
export class AppModule { }
