import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { JsonLogger } from './common/logging/json-logger.js';
import { environment } from './config/environment.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: environment.isProduction ? new JsonLogger() : undefined,
  });
  // Behind a reverse proxy (spec §36) the client IP comes from X-Forwarded-For; needed for rate limiting.
  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '1mb' });
  configureApp(app);

  if (!environment.isProduction) {
    const config = new DocumentBuilder()
      .setTitle('LifeOS API')
      .setDescription('Personal Life Operating System — REST API v1')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(environment.port);
}
await bootstrap();
