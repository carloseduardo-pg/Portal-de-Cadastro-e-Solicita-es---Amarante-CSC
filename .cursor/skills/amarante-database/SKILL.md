---
name: amarante-database
description: >-
  Operates Portal Amarante PostgreSQL: setup, migrate deploy, seed, triggers, audit_log,
  apply-triggers, integrity rules for requests/products. Use when working on Prisma schema,
  migrations, seed, SQL triggers, audit, or database scripts.
---

# Amarante — banco e triggers

Database: **`amarante`**. URL: `postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public`

## Scripts

```bash
bash database/scripts/setup.sh
bash database/scripts/migrate.sh
bash database/scripts/apply-triggers.sh
bash database/scripts/check.sh
bash database/scripts/seed.sh
```

Na raiz: `npm run setup` · `npm run migrate` · `npm run check:db`

## Regras

1. Não usar `prisma migrate dev` em scripts de equipe (pede nome interativo).
2. Nome da migration descreve o schema — nunca nome de pessoa.
3. `audit_log` omite `password_hash`.
4. ITM-01: descrições de item em CAIXA ALTA no banco (trigger).
5. ITM-09: NCM confirmado exige `ncm_confirmed_by`.
6. ITM-11: `requests.family_id` NOT NULL.

## Ao mudar schema

1. Editar `backend/prisma/schema.prisma`
2. Migration descritiva
3. Se precisa audit/regras → `database/sql/03-triggers.sql` **e** migration
4. `migrate deploy` / `migrate.sh`
5. Atualizar `database/info/tabelas.md` + `docs/projeto/mapa-entidades.md`

## Seed

`backend/prisma/seed.ts` — hotéis, PDM, produtos da base, usuários locais (**sem** solicitações mock).

Login: `admin@amarante.local` / `amarante123`

## Docs

`database/README.md` · `database/info/` · `docs/projeto/especificacoes.md`
