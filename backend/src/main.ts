import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

/** Origens permitidas no CORS (lista separada por vírgula no .env). */
function resolveCorsOrigins(raw: string | undefined, nodeEnv: string): string[] {
  const fromEnv = raw?.trim()
    ? raw.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  if (nodeEnv === 'development') {
    const vitePorts = [5180, 5174, 5175, 5176];
    const devOrigins = vitePorts.flatMap((port) => [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]);
    return [...new Set([...fromEnv, ...devOrigins])];
  }

  if (fromEnv.length) return fromEnv;
  return ['http://localhost:5180'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV') || 'development';
  const corsOrigins = resolveCorsOrigins(config.get<string>('CORS_ORIGIN'), nodeEnv);

  app.use(
    helmet({
      // Swagger UI carrega assets inline — evita bloquear /api/docs em dev
      contentSecurityPolicy:
        config.get('NODE_ENV') === 'production' ? undefined : false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  const swagger = new DocumentBuilder()
    .setTitle('Portal Amarante CSC — API')
    .setDescription(
      'API base Prottus (NestJS). Auth via cookies httpOnly (`access_token` / `refresh_token`). ' +
        'Use o botão Authorize apenas se testar Bearer; neste projeto o fluxo padrão é cookie.',
    )
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .addTag('auth', 'Login / refresh / logout / me')
    .addTag('users')
    .addTag('products')
    .addTag('requests')
    .addTag('catalog')
    .addTag('suppliers')
    .addTag('dashboard')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(config.get('PORT') || 3000);
  await app.listen(port);
  console.log(`Portal Amarante API em http://localhost:${port}/api`);
  console.log(`Swagger     em http://localhost:${port}/api/docs`);
}
bootstrap();
