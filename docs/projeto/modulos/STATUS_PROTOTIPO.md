# Status do protótipo — Portal Amarante CSC

**Atualizado:** 2026-09-04  
**Produto:** Portal de Cadastro & Solicitação (substitui Semplice)

---

## Veredito

| Critério | Status |
|----------|--------|
| Domínio Amarante (hotels, requests, PDM) | OK — schema + seed + catálogo SAP |
| Auth JWT httpOnly + usuário ativo | OK |
| Segurança (Helmet, throttle, ValidationPipe) | OK |
| UI marca Amarante (tokens, logos vazados) | OK |
| Módulo Produtos (core) | OK — inclusão, alteração, bloqueio, fila e base |
| Alteração / Bloqueio | OK — formulário único pré-preenchido; bloqueio unificado por flags |
| Fornecedores | Parcial — listagens; nova solicitação sem persistência |
| Fiscal | Placeholder (menu desabilitado) |
| Parametrizações — Produtos | CRUD + status (famílias, subgrupos, grupos, hotéis, centros de custo, UM) |
| Integrações SAP / V360 / CM | Fora do protótipo (TODOs no schema) |
| Homologação | Alvo 02/10/2026 |

---

## Camadas

| Camada | Status |
|--------|--------|
| Docs projeto | Alinhados ao Portal Amarante CSC |
| Docs Prottus | Intactos (empresa) |
| Frontend | React 19 — Home, Produtos, Parametrizações, shell colapsável |
| Backend | NestJS — auth, products, requests, catalog, suppliers, dashboard |
| Banco | PostgreSQL `amarante` — migrations + seed local |

---

## Rotas UI → API

### Autenticação

| UI | API |
|----|-----|
| `/login` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |

### Home

| UI | API |
|----|-----|
| `/home` | — (saudação local; dashboard produtos em `/produtos`) |

### Produtos

| UI | API |
|----|-----|
| `/produtos` | `GET /api/dashboard/products` |
| `/produtos/nova-solicitacao` | `GET /api/products/search` + `GET /api/catalog/*` |
| `/produtos/dados-do-item` | `POST/PATCH /api/requests` + catálogo |
| `/produtos/produto-existente` | `GET /api/products/:id` + `POST/PATCH /api/requests` |
| `/produtos/caixa-de-entrada` | `GET /api/requests/inbox` |
| `/produtos/solicitacoes` | `GET /api/requests/queue` |
| `/produtos/solicitacao/:id` | `GET /api/requests/:id` |
| `/produtos/base` | `GET /api/products/base` · `DELETE /api/products/:id` (admin, sem sap_code) |

`GET /api/requests/kanban` existe só para testes de carga — a UI não usa.

Redirects legados: `/produtos/todas-solicitacoes`, `/minhas-solicitacoes` → `/solicitacoes`; `/inativos` → `/base`.

### Fornecedores

| UI | API |
|----|-----|
| `/fornecedores/*` | `GET /api/suppliers` (parcial) — nova solicitação sem persistência |

### Outros

| UI | API |
|----|-----|
| `/notificacoes` | `GET /api/notifications` |
| `/parametrizacoes/produtos` | Famílias / Subgrupos / Grupos + hotéis / centros de custo / UM |
| `/parametrizacoes/administrativo` | Stub (CRUD de usuários ainda não na UI) |
| `/fiscal/*` | Placeholder (menu desabilitado) |

---

## Módulos API (backend)

| Módulo | Prefixo | Entidades |
|--------|---------|-----------|
| `auth` | `/api/auth` | users, sessão JWT |
| `users` | `/api/users` | users |
| `products` | `/api/products` | products, product_hotels |
| `requests` | `/api/requests` | requests, request_items, stages |
| `catalog` | `/api/catalog` | families, groups, subgroups, hotels, centros, UM |
| `suppliers` | `/api/suppliers` | suppliers |
| `dashboard` | `/api/dashboard` | agregados |
| `notifications` | `/api/notifications` | notifications |
| `health` | `/api/health` | healthcheck |

---

## Como subir

```bash
cp .env.example .env && cp .env.example backend/.env
# Local: SEED_DEMO_USER_ON_BOOT=true em backend/.env
npm run install:all && npm run setup
npm run dev
```

UI: `http://localhost:5180`  
Login local: `admin@amarante.local` / `amarante123`

---

## Pendências conhecidas

- Fornecedores: fluxo de nova solicitação CNPJ sem persistência
- Fiscal e parametrizações Administrativo — stubs
- Testes E2E browser automatizados
- CI/homolog — a definir com infra Amarante
