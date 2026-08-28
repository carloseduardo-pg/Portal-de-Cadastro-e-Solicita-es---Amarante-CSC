# Escalabilidade — Portal Amarante CSC

Práticas de escala do protótipo. Stack: [`especificacoes.md`](especificacoes.md).

---

## API

| Prática | Onde |
|---------|------|
| Paginação | `common/pagination.ts` — `{ data, meta: { page, limit, total } }` |
| Listagens | `take`/`skip` Prisma; evitar `findMany` sem limite |
| Rate limit | Throttler NestJS |
| Índices | GIN `pg_trgm` + btree em `products.description_short` (busca e duplicata exata) |

---

## Banco

| Prática | Nota |
|---------|------|
| Connection pool | Prisma default; ajustar em produção |
| `audit_log` | Retenção/archival a definir em homolog |
| Triggers | Idempotentes — `apply-triggers.sh` |

---

## Testes de carga

| Nível | Comando |
|-------|---------|
| Smoke | `npm run test:smoke` |
| Stress | `npm run test:stress` (backend/stress) |

Credenciais stress: `STRESS_EMAIL=admin@amarante.local` (ver `backend/stress/README.md`).

---

## Frontend

- Busca ao vivo com debounce nas listagens grandes
- Kanban carrega colunas via API única (`/api/requests/kanban`)
- Sem estado global pesado no protótipo

Skill agente: `.cursor/skills/amarante-load-tests/SKILL.md`
