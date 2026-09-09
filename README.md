# Portal Amarante CSC

Protótipo web do **Portal de Cadastro & Solicitação** da Amarante (Centro de Serviços Compartilhados). Stack React + NestJS + PostgreSQL, metodologia Prottus.

**Homologação alvo:** 02/10/2026

---

## O que é

Cadastro de itens (PDM), solicitações, fornecedores, parametrizações e módulo fiscal (fora do protótipo de telas internas). Substitui o Semplice no cadastro de itens; o V360 permanece no fluxo fiscal.

Documentação: [`docs/projeto/README.md`](docs/projeto/README.md).  
**VPS:** [`docs/projeto/deploy-vps.md`](docs/projeto/deploy-vps.md).

---

## Início rápido

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Credenciais em `.env` (`DATABASE_URL` = usuário da **aplicação**, não o superuser `postgres`)

### Setup

```bash
cp .env.example .env
# edite DATABASE_URL / JWT / CORS
cp .env backend/.env
npm run install:all
npm run verify:env    # valida usuário/senha antes de migrar
npm run setup
```

### Desenvolvimento

```bash
npm run dev
```

Sobe **API** (`:3000`) e **UI** (`:5180`) juntos. Para subir só um serviço:

```bash
npm run dev:api   # http://localhost:3000/api/docs
npm run dev:web   # http://localhost:5180
```

### Login local

| Campo | Valor |
|-------|-------|
| E-mail | `admin@amarante.local` |
| Senha | `amarante123` |

Requer seed (`npm run setup` ou `SEED_DEMO_USER_ON_BOOT=true`).

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
| Produtos | `/produtos/*` | Funcional (inclusão, alteração, bloqueio) |
| Fornecedores | `/fornecedores/*` | Parcial (consultas; nova solicitação sem persistência) |
| Parametrizações | `/parametrizacoes/*` | CRUD de catálogo (famílias, hotéis, centros, UM) |
| Fiscal | `/fiscal/*` | Desabilitado no menu |
| Suporte / FAQ | `/suporte`, `/faq` | FAQ operacional; suporte sem canal oficial |

Detalhe: [`docs/projeto/modulos/STATUS_PROTOTIPO.md`](docs/projeto/modulos/STATUS_PROTOTIPO.md).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run verify:env` | Valida `.env` + autenticação PostgreSQL |
| `npm run dev` | API + frontend em paralelo |
| `npm run setup` | Cria DB, migrate, seed local, check |
| `npm run migrate` | Aplica migrations Prisma (sem seed) |
| `npm run build` | Build backend + frontend |
| `npm run start:api` | API em modo produção |
| `npm run seed` | Seed local explícito |
| `npm run check:db` | Valida tabelas |
| `npm run lint` | Lint backend + frontend |
| `npm run test:smoke` | Smoke auth + endpoints |
| `npm run test:stress` | Stress backend |

---

## Contribuição

[`CONTRIBUTING.md`](CONTRIBUTING.md).
