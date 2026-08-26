---
name: amarante-tech-lead-context
description: >-
  Loads Portal Amarante tech-lead domain context: stack rationale, request lifecycle,
  security/scale talking points, and code map for meetings. Use when the user
  asks how the architecture works, why a technology was chosen, onboarding
  developers, or preparing for a technical meeting.
---

# Amarante — contexto tech lead

Fonte: `docs/projeto/especificacoes.md`  
Complementos: `seguranca.md` · `escalabilidade.md` · `fluxo-aplicacao.md` · `STATUS_PROTOTIPO.md`

## Cola

- Stack: React 19 + Vite · NestJS 11 · Prisma · PostgreSQL `amarante` · JWT cookie httpOnly
- Sem Docker; Postgres local
- Tokens **não** no localStorage
- Domínio: hotels, families, products, requests, suppliers — **não** clients/orders
- Regras: ITM-01 (CAIXA ALTA), ITM-09 (NCM confirmado), ITM-11 (lote = 1 família)
- Homologação alvo: 02/10/2026

## Mapa pergunta → arquivo

| Pergunta | Arquivo |
|----------|---------|
| Cookie? | `backend/src/auth/auth.controller.ts` |
| JWT? | `backend/src/auth/jwt.strategy.ts` |
| Helmet/CORS? | `backend/src/main.ts` |
| Throttler? | `backend/src/app.module.ts` |
| Kanban? | `backend/src/requests/` |
| Schema? | `backend/prisma/schema.prisma` |
| Triggers? | `database/sql/03-triggers.sql` |
| Menu UI? | `frontend/src/components/AppShell.tsx` |
| Rotas UI? | `frontend/src/App.tsx` |

## Onboarding

1. `docs/projeto/README.md`
2. Subir local (`amarante-local-run`)
3. Smoke (`amarante-load-tests`)
4. Login: `admin@amarante.local` / `amarante123`
