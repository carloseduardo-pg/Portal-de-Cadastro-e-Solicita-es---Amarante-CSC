# Triggers — Portal Amarante CSC

Único SQL operacional: [`../sql/03-triggers.sql`](../sql/03-triggers.sql). Schema de tabelas vem do Prisma.

```bash
bash database/scripts/apply-triggers.sh
```

Também roda no `migrate.sh` depois do `prisma migrate deploy`.

| Item | Efeito |
|------|--------|
| `pg_trgm` + GIN | Busca similaridade em `products.description_short` |
| CHECK `products_ncm_requires_confirmation` | ITM-09 |
| `fn_itm01_uppercase_descriptions` | ITM-01 em products e request_items |
| `fn_set_updated_at` | `updated_at` |
| `fn_audit_row` | `audit_log` (omite `password_hash`) |

Tabelas auditadas: `users`, `products`, `requests`, `request_items`, `suppliers`.
