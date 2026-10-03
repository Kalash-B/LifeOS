import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApp } from './bootstrap.js';
import { environment } from './config/environment.js';

/** Long-running server (local dev, Docker). Vercel uses src/serverless.ts instead. */
async function bootstrap() {
  const app = await createApp();

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
