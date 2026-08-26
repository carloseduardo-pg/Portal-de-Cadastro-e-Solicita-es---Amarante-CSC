---
name: amarante-add-crud
description: >-
  Adds a Portal Amarante-style CRUD end-to-end (Prisma model, Nest module, React page,
  pagination, JWT guard). Use when creating a new entity CRUD, module, grid,
  form modal, or extending products/requests/suppliers patterns.
---

# Amarante — adicionar CRUD

Espelhar `products`, `requests` ou `suppliers`.

## Checklist

```
- [ ] Prisma model + migration (nome descreve o schema)
- [ ] Nest: module, controller, service, DTOs
- [ ] Sem `@Public()` (JWT já é global)
- [ ] Paginação via common/pagination (page/pageSize, máx 100)
- [ ] FE: page + resources.ts + rota em App.tsx (ProtectedRoute)
- [ ] Item no AppShell se for módulo de menu
- [ ] Docs: mapa-entidades.md + spec em docs/projeto/modulos/
```

## Backend

1. Model em `backend/prisma/schema.prisma`
2. Estrutura `backend/src/<recurso>/` (module, controller, service, dto)
3. Registrar em `app.module.ts`
4. Listagens com `page`/`pageSize`

## Frontend

1. Helper em `frontend/src/lib/resources.ts` via `apiFetch`
2. Página em `frontend/src/pages/`
3. Rota em `App.tsx` dentro de `AppShell`
4. Estilos: tokens Amarante + `crud.css` — botão primário compacto (não 100% fora do login)

## Regras

- Sem JWT no `localStorage`
- Sem emoji (`Icon`)
- Código/DB em inglês; UI em português
- Tabela nova com auditoria → `database/sql/03-triggers.sql` + migration

## Referência

`docs/projeto/especificacoes.md` · `docs/projeto/ARQUITETURA.md` · `docs/projeto/padrao-aplicacoes.md`
