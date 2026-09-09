# Conexão — PostgreSQL Amarante

| Item | Valor (default local) |
|------|-------|
| Engine | PostgreSQL (local / VPS) |
| Host | `127.0.0.1` |
| Porta | `5432` |
| Database | **`amarante`** |
| Usuário | `postgree` |
| Senha | `postgree` |
| Schema | `public` |

`DATABASE_URL` (fonte da verdade para API **e** scripts `setup` / `migrate` / `check`):

```text
postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public
```

Arquivos: [`.env`](../../.env) e [`backend/.env`](../../backend/.env) — **mantenha os dois iguais** na VPS.

Na VPS, troque usuário/senha/host/database nessa URL. Opcional para criar role como superuser: `POSTGRES_ADMIN_URL` (ver `.env.example`).
