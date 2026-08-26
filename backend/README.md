# API — Portal Amarante CSC

NestJS 11 + Prisma 6 + PostgreSQL + JWT (cookies **httpOnly**).

Docs: [`../docs/projeto/especificacoes.md`](../docs/projeto/especificacoes.md) · [`../docs/projeto/seguranca.md`](../docs/projeto/seguranca.md)

---

## Estrutura

```
src/
  auth/           login, refresh, logout, me
  users/          usuários
  products/       base de produtos (ativos/inativos)
  requests/       solicitações, kanban, fila
  catalog/        famílias, busca PDM
  suppliers/      fornecedores
  dashboard/      resumos
  notifications/  notificações
  common/         paginação, filtros
  prisma/         PrismaService
prisma/           schema + migrations + seed
stress/           testes de carga
```

---

## Comandos

```bash
cp ../.env.example .env
npm install
npx prisma migrate deploy   # ou: bash ../database/scripts/migrate.sh
npm run dev                 # watch :3000
```

| Endpoint | URL |
|----------|-----|
| API | http://127.0.0.1:3000/api |
| Swagger | http://127.0.0.1:3000/api/docs |
| Health | http://127.0.0.1:3000/api/health |

---

## Variáveis (.env)

Ver [`../.env.example`](../.env.example). Database: `amarante`. Seed local: `admin@amarante.local` quando `SEED_DEMO_USER_ON_BOOT=true`.

---

## Exports

Índice de funções públicas: [`FUNCTIONS.md`](FUNCTIONS.md).
