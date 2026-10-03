import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { JsonLogger } from './common/logging/json-logger.js';
import { environment } from './config/environment.js';

/** Builds the fully configured app; shared by the long-running server and the serverless entry. */
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: environment.isProduction ? new JsonLogger() : undefined,
  });
  // Client IP comes from X-Forwarded-For behind proxies (spec §36); rate limiting depends on it.
  app.set('trust proxy', environment.trustProxyHops);
  app.useBodyParser('json', { limit: '1mb' });
  configureApp(app);
  return app;
}
