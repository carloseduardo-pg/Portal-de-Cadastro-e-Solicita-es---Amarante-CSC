# Arquitetura — Portal Amarante CSC

Visão técnica do mono-repo Amarante. Metodologia Prottus: [`docs/prottus/metodologia.md`](../prottus/metodologia.md).

---

## Estilo

| Decisão | Valor |
|---------|-------|
| Padrão | Modular Monolith + SPA |
| Repositório | Mono-repo (`frontend`, `backend`, `database`) |
| Deploy protótipo | Local — Postgres + Node (sem containers obrigatórios) |
| Auth | JWT em cookies httpOnly (access + refresh) |

---

## Camadas de negócio (visão Amarante)

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — TELAS (React SPA)                           │
│  Produtos · Fornecedores · Parametrizações · Fiscal     │
├─────────────────────────────────────────────────────────┤
│  CAMADA 2 — API (NestJS)                                │
│  auth · requests · products · catalog · suppliers       │
├─────────────────────────────────────────────────────────┤
│  CAMADA 3 — DADOS (PostgreSQL + Prisma)                 │
│  PDM · solicitações · fornecedores · audit              │
├─────────────────────────────────────────────────────────┤
│  CAMADA 4 — INTEGRAÇÕES (futuro, fora do protótipo)    │
│  SAP · V360 · CM                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo HTTP típico

```
Browser (:5173)
    │  fetch credentials:include
    ▼
Vite dev proxy / API_URL
    ▼
NestJS (:3000/api)
    │  JwtAuthGuard (exceto login/health)
    │  ValidationPipe
    ▼
Service → Prisma → PostgreSQL (amarante)
```

Swagger: `http://localhost:3000/api/docs`

---

## Módulos NestJS

| Módulo | Responsabilidade |
|--------|------------------|
| `AuthModule` | Login, refresh, logout, `/me` |
| `UsersModule` | CRUD usuários |
| `ProductsModule` | Base de produtos, status ativo/inativo |
| `RequestsModule` | Solicitações, kanban, inbox, detalhe |
| `CatalogModule` | Famílias, busca similaridade, PDM |
| `SuppliersModule` | Fornecedores |
| `DashboardModule` | Resumos produtos |
| `NotificationsModule` | Notificações usuário |
| `PrismaModule` | Cliente ORM global |

Guards globais: JWT (rotas protegidas), Throttler, Helmet headers.

---

## Frontend

| Área | Local |
|------|-------|
| Rotas | `frontend/src/App.tsx` |
| Layout | `frontend/src/components/AppShell.tsx` |
| Auth | `frontend/src/auth/` |
| Páginas | `frontend/src/pages/` |
| Tokens CSS | `frontend/src/styles/amarante-tokens.css` |
| API client | `frontend/src/lib/api.ts` |

Estado: fetch + React state (sem Redux no protótipo).

---

## Banco

- ORM: Prisma 6 — schema em `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Scripts: `database/scripts/` (setup, migrate, check, seed)
- Triggers/audit: `database/sql/`

---

## Testes

| Tipo | Onde |
|------|------|
| Unit backend | `backend/src/**/*.spec.ts` |
| Smoke API | `tests/load/` |
| Stress | `backend/stress/` |
