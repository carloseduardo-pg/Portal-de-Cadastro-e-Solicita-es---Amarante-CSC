# Conexão — PostgreSQL Amarante

| Item | Valor |
|------|-------|
| Engine | PostgreSQL (local) |
| Host | `127.0.0.1` |
| Porta | `5432` |
| Database | **`amarante`** |
| Usuário | `postgree` |
| Senha | `postgree` |
| Schema | `public` |

`DATABASE_URL`:

```text
postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public
```

Arquivos: [`.env`](../../.env) e [`backend/.env`](../../backend/.env).
