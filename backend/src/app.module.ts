import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CapabilitiesGuard } from './auth/capabilities.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { RequestsModule } from './requests/requests.module';
import { CatalogModule } from './catalog/catalog.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Raiz primeiro: na VPS o time edita `.env` na raiz; backend/.env é espelho (sync nos scripts).
      envFilePath: ['../.env', '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    RequestsModule,
    CatalogModule,
    SuppliersModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CapabilitiesGuard,
    },
  ],
})
export class AppModule {}
