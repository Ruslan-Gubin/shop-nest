import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from 'src/product/product.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ProductModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        entities: [],
        host: configService.get<string>('NEO_DB_HOST'),
        port: configService.get('NEO_DB_PORT'),
        username: configService.get<string>('NEO_DB_USERNAME'),
        password: configService.get<string>('NEO_DB_PASSWORD'),
        database: configService.get<string>('NEO_DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true, //remove production
        extra: {
          ssl: true,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
