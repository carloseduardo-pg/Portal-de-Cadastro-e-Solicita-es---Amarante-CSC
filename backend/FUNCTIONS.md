# Índice de exports — backend Portal Amarante CSC

Atualize ao exportar API pública nova.

## common

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `PageParams` | `src/common/pagination.ts` | Params de paginação |
| `PageResult` | `src/common/pagination.ts` | Envelope das listagens |
| `parsePage` | `src/common/pagination.ts` | Normaliza page/pageSize (máx. 100) |
| `pageResult` | `src/common/pagination.ts` | Monta envelope |
| `skipTake` | `src/common/pagination.ts` | skip/take Prisma |
| `Public` | `src/common/public.decorator.ts` | Rota sem JWT |

## config / prisma

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `validateEnv` | `src/config/env.validation.ts` | Valida `.env` no boot |
| `PrismaService` | `src/prisma/prisma.service.ts` | Cliente ORM |
| `PrismaModule` | `src/prisma/prisma.module.ts` | Prisma global |

## auth / users

| Export | Arquivo | Responsabilidade |
|--------|---------|------------------|
| `AuthService` | `src/auth/auth.service.ts` | Login, refresh, me; seed local |
| `AuthController` | `src/auth/auth.controller.ts` | Cookies httpOnly |
| `JwtStrategy` | `src/auth/jwt.strategy.ts` | Cookie + usuário ativo |
| `JwtAuthGuard` | `src/auth/jwt-auth.guard.ts` | Guard global; `@Public()` libera |
| `UsersModule` | `src/users/` | CRUD usuários |

## domínio Amarante

| Export | Arquivo | Prefixo API |
|--------|---------|-------------|
| `ProductsModule` | `src/products/` | `/api/products` |
| `RequestsModule` | `src/requests/` | `/api/requests` |
| `CatalogModule` | `src/catalog/` | `/api/catalog` |
| `SuppliersModule` | `src/suppliers/` | `/api/suppliers` |
| `DashboardModule` | `src/dashboard/` | `/api/dashboard` |
| `NotificationsModule` | `src/notifications/` | `/api/notifications` |
| `HealthController` | `src/health.controller.ts` | `/api/health` |
