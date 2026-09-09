# Database — Portal Amarante CSC

PostgreSQL local (**sem Docker**). Setup, migrations Prisma, triggers, auditoria e seed.

| Conteúdo | Caminho |
|----------|---------|
| Este guia | README |
| Conexão, tabelas, seed, triggers | [`info/`](info/) |
| Scripts | [`scripts/`](scripts/) |
| SQL (role, DB, triggers) | [`sql/`](sql/) |
| Segurança | [`../docs/projeto/seguranca.md`](../docs/projeto/seguranca.md) |
| Entidades | [`../docs/projeto/mapa-entidades.md`](../docs/projeto/mapa-entidades.md) |

Migrations: [`../backend/prisma/`](../backend/prisma/)

---

## Conexão (desenvolvimento)

| Item | Valor default local |
|------|---------------------|
| Host | `127.0.0.1` |
| Porta | `5432` |
| Database | **`amarante`** |
| Usuário / senha | `postgree` / `postgree` |
| URL | `postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public` |

**Fonte da verdade:** `DATABASE_URL` em [`.env`](../.env) e [`backend/.env`](../backend/.env) (gitignored).  
Os scripts `setup.sh` / `migrate.sh` / `check.sh` / `apply-triggers.sh` **leem essa URL** — não usam mais usuário hardcoded.

Na VPS: coloque a URL real nos **dois** arquivos (ou só na raiz e deixe o setup copiar para `backend/.env`).  
Admin opcional para criar role/DB: `POSTGRES_ADMIN_URL` (ver `.env.example`).

---

## Primeira vez

```bash
npm run setup    # na raiz — ou manualmente:
bash database/scripts/setup.sh
bash database/scripts/migrate.sh
bash database/scripts/check.sh
```

Seed e triggers: [`info/exemplos-seed.md`](info/exemplos-seed.md) · [`info/triggers.md`](info/triggers.md).

---

## Scripts

| Script | Função |
|--------|--------|
| `scripts/_db_env.sh` | Carrega/parseia `DATABASE_URL` (interno) |
| `scripts/check.sh` | Valida tabelas Amarante + contagens |
| `scripts/setup.sh` | Role + database conforme `.env` |
| `scripts/migrate.sh` | Migrations Prisma + seed |
| `scripts/apply-triggers.sh` | Reaplica triggers / `audit_log` |
| `scripts/seed.sh` | Só seed |
| `scripts/studio.sh` | Prisma Studio |

---

## Produção / VPS

- Trocar `DATABASE_URL` e secrets JWT — não versionar credenciais reais.
- Manter omissão de campos sensíveis na auditoria.
- Índices e retenção: [`../docs/projeto/escalabilidade.md`](../docs/projeto/escalabilidade.md).
- Se `npm run setup` criar role/DB errado, confira se `backend/.env` não ficou com o default `postgree` antigo.