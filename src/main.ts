import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { validationPipe } from "./lib/validationPipe";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors();

	app.useGlobalPipes(validationPipe);

	await app.listen(process.env.PORT ?? 4010);
}
bootstrap().catch((error) => console.log("Error:", error));
