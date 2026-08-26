# Portal Amarante CSC

Protótipo web do **Portal de Cadastro & Solicitação** da Amarante (Centro de Serviços Compartilhados). Stack React + NestJS + PostgreSQL, metodologia Prottus.

**Homologação alvo:** 02/10/2026

---

## O que é

Cadastro de itens (PDM), solicitações, fornecedores, parametrizações e módulo fiscal (placeholder). Substitui o Semplice no cadastro de itens; o V360 permanece no fluxo fiscal.

Documentação: [`docs/projeto/README.md`](docs/projeto/README.md).

---

## Início rápido

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+ em `127.0.0.1:5432`
- Role `postgree` / senha `postgree` (ou ajuste em `.env`)

### Setup

```bash
cp .env.example .env
cp .env.example backend/.env
npm run install:all
npm run setup
```

### Desenvolvimento

```bash
npm run dev
```

Sobe **API** (`:3000`) e **UI** (`:5173`) juntos. Para subir só um serviço:

```bash
npm run dev:api   # http://localhost:3000/api/docs
npm run dev:web   # http://localhost:5173
```

### Login local

| Campo | Valor |
|-------|-------|
| E-mail | `admin@amarante.local` |
| Senha | `amarante123` |

Requer `SEED_DEMO_USER_ON_BOOT=true` em `backend/.env`.

---

## Estrutura

```
frontend/     SPA React — telas, AppShell, tokens Amarante
backend/      API NestJS — auth, produtos, solicitações, fornecedores
database/     Scripts setup/migrate, SQL triggers
docs/projeto/ Specs Amarante (ler daqui)
docs/prottus/ Metodologia empresa (não editar)
tests/load/   Smoke tests de API
.cursor/      Rules e skills
```

---

## Módulos (UI)

| Módulo | Rotas | Status |
|--------|-------|--------|
| Home | `/home` | OK |
| Produtos | `/produtos/*` | Protótipo funcional |
| Fornecedores | `/fornecedores/*` | Placeholders |
| Parametrizações | `/parametrizacoes/*` | Placeholders |
| Fiscal | `/fiscal/*` | Desabilitado no menu |
| Suporte / FAQ | `/suporte`, `/faq` | Placeholders |

Detalhe: [`docs/projeto/modulos/STATUS_PROTOTIPO.md`](docs/projeto/modulos/STATUS_PROTOTIPO.md).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | API + frontend em paralelo |
| `npm run setup` | Cria DB, migrate, seed, check |
| `npm run migrate` | Aplica migrations Prisma |
| `npm run check:db` | Valida tabelas |
| `npm run lint` | Lint backend + frontend |
| `npm run test:smoke` | Smoke auth + endpoints |
| `npm run test:stress` | Stress backend |

---

## Contribuição

[`CONTRIBUTING.md`](CONTRIBUTING.md).
