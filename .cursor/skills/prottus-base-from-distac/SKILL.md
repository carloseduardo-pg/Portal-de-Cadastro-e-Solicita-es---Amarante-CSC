---
name: prottus-base-from-distac
description: >-
  Guides cloning this Amarante Prottus web repo as base for a new client
  (brand, domain, schema, keep security pillars).
  Use when starting a new Prottus project from this model, forking, or adapting
  for another customer.
---

# Prottus — novo cliente a partir desta base

Este repositório **já é** o Portal Amarante CSC. Para **outro** cliente, clone e adapte.

## O que preservar

- JWT httpOnly, Helmet, Throttler, ValidationPipe, audit triggers
- Mono-repo: `frontend/`, `backend/`, `database/`
- `.cursor/rules/prottus/` e skills `amarante-*` (renomear para `<cliente>-*`)

## Checklist adaptação

1. Marca / logo / tokens (`design-system.md`, `amarante-tokens.css` → `<cliente>-tokens.css`)
2. `docs/projeto/contexto.md`, `especificacoes.md`, módulos
3. Rule `.cursor/rules/projeto/<cliente>.mdc`
4. Prisma schema + migration inicial do domínio
5. Remover entidades/módulos que não existem no novo cliente
6. Atualizar README raiz e `docs/projeto/README.md`

Docs: [`docs/projeto/especificacoes.md`](../../docs/projeto/especificacoes.md) · [`README.md`](../../README.md)
