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

| Item | Valor |
|------|-------|
| Host | `127.0.0.1` |
| Porta | `5432` |
| Database | **`amarante`** |
| Usuário / senha | `postgree` / `postgree` |
| URL | `postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public` |

Env: [`.env`](../.env) e [`backend/.env`](../backend/.env) (gitignored).

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
| `scripts/check.sh` | Valida tabelas Amarante + contagens |
| `scripts/setup.sh` | Role + database `amarante` |
| `scripts/migrate.sh` | Migrations Prisma + seed |
| `scripts/apply-triggers.sh` | Reaplica triggers / `audit_log` |
| `scripts/seed.sh` | Só seed |
| `scripts/studio.sh` | Prisma Studio |

---

## Produção

- Trocar `DATABASE_URL` e secrets JWT — não versionar credenciais reais.
- Manter omissão de campos sensíveis na auditoria.
- Índices e retenção: [`../docs/projeto/escalabilidade.md`](../docs/projeto/escalabilidade.md).
