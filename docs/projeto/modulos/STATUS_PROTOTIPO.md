# Status do protótipo — Portal Amarante CSC

**Atualizado:** 2026-08-24  
**Produto:** Portal de Cadastro & Solicitação (substitui Semplice)

---

## Veredito

| Critério | Status |
|----------|--------|
| Domínio Amarante (hotels, requests, PDM) | OK — schema + seed |
| Auth JWT httpOnly + usuário ativo | OK |
| Segurança (Helmet, throttle, ValidationPipe) | OK |
| UI marca Amarante (tokens, logos vazados) | OK |
| Módulo Produtos (core) | Parcial — telas principais; alguns forms só UI |
| Fornecedores / Fiscal / Parametrizações | Placeholders |
| Integrações SAP / V360 / CM | Fora do protótipo (TODOs no schema) |
| Homologação | Alvo 02/10/2026 |

---

## Camadas

| Camada | Status |
|--------|--------|
| Docs projeto | Atualizados para Amarante |
| Docs Prottus | Intactos (empresa) |
| Frontend | React 19 — Home, Produtos remodelado, shell colapsável |
| Backend | NestJS — auth, products, requests, catalog, suppliers, dashboard |
| Banco | PostgreSQL `amarante` — migration `amarante_domain_init` + seed |

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
| `/produtos/caixa-de-entrada` | `GET /api/requests/queue` |
| `/produtos/solicitacoes` | `GET /api/requests/kanban` (board + lista, filtros) |
| `/produtos/solicitacao/:id` | `GET /api/requests/:id` |
| `/produtos/base` | `GET /api/products/base` (ativos/inativos/todos) |

Redirects legados: `/produtos/todas-solicitacoes`, `/minhas-solicitacoes` → `/solicitacoes`; `/inativos` → `/base`.

### Fornecedores

| UI | API |
|----|-----|
| `/fornecedores/*` | `GET /api/suppliers` (parcial) — demais telas placeholder |

### Outros

| UI | API |
|----|-----|
| `/notificacoes` | `GET /api/notifications` |
| `/parametrizacoes/*` | Placeholder |
| `/fiscal/*` | Placeholder (menu desabilitado) |

---

## Módulos API (backend)

| Módulo | Prefixo | Entidades |
|--------|---------|-----------|
| `auth` | `/api/auth` | users, sessão JWT |
| `users` | `/api/users` | users |
| `products` | `/api/products` | products, product_hotels |
| `requests` | `/api/requests` | requests, request_items, stages |
| `catalog` | `/api/catalog` | families, groups, busca PDM |
| `suppliers` | `/api/suppliers` | suppliers |
| `dashboard` | `/api/dashboard` | agregados |
| `notifications` | `/api/notifications` | notifications |
| `health` | `/api/health` | healthcheck |

---

## Como subir

```bash
cp .env.example .env && cp .env.example backend/.env
npm run install:all && npm run setup
npm run dev
```

Login: `admin@amarante.local` / `amarante123`

---

## Pendências conhecidas

- Fornecedores, parametrizações e fiscal — telas stub
- Testes E2E browser automatizados
- CI/homolog — a definir com infra Amarante
