import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: false,
      transform: true
    })
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('CORE_PORT') ?? 4001;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('B2B 租赁核心 API')
    .setDescription('核心服务的 API 文档')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('NestJS 应用启动失败', error);
  process.exitCode = 1;
});
