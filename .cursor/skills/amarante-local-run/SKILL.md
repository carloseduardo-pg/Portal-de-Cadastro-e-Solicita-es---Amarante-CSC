---
name: amarante-local-run
description: >-
  Sobe e valida o ambiente local Portal Amarante (Postgres, migrate/seed, API Nest,
  UI Vite, healthcheck). Use when the user asks to run the project, start
  backend/frontend, setup database, migrate, seed, or fix local startup.
---

# Portal Amarante — subir ambiente local

## Ordem obrigatória

1. Postgres na porta `5432`
2. `bash database/scripts/setup.sh` (se DB/role ainda não existem)
3. `bash database/scripts/migrate.sh` → `prisma migrate deploy` + seed
4. `bash database/scripts/check.sh`
5. `npm run dev` na raiz → API `http://127.0.0.1:3000/api` + UI `http://127.0.0.1:5180`
   - Só API: `npm run dev:api` · Só UI: `npm run dev:web`

## Env

- Copiar `.env.example` → `.env` e `backend/.env`
- Nunca commitar `.env`
- Vars validadas no boot (`config/env.validation.ts`): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `PORT`, `NODE_ENV`, `SEED_DEMO_USER_ON_BOOT` (default false; local Portal Amarante = true)
- FE opcional: `frontend/.env` com `VITE_API_URL` (default `http://localhost:3000/api`)

## Login seed

`admin@amarante.local` / `amarante123` (campos da UI vazios de propósito)  
Criado pelo **Prisma seed** (`migrate.sh`) e, se flag ligada, também no boot da API.
## Smoke rápido

```bash
curl -s http://127.0.0.1:3000/api/health
node tests/load/run-node.mjs smoke
```

## Erros comuns

| Sintoma | Ação |
|---------|------|
| Postgres recusado | Iniciar serviço local na 5432 |
| Seed `id` null / audit | Garantir `DEFAULT gen_random_uuid()` em `audit_log.id` |
| Database errado | `.env` deve apontar para `amarante`, não outro nome |
| Porta 3000 em uso | Um único `nest start --watch` |
| `migrate dev` pedindo nome | Usar `migrate.sh` (`deploy`) |

## Docs

`README.md` · `database/README.md` · `docs/projeto/especificacoes.md`
