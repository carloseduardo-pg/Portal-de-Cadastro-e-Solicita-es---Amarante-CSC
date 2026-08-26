# Testes — Portal Amarante CSC

Carga e segurança (3 níveis). Docs: [`docs/projeto/seguranca.md`](../docs/projeto/seguranca.md) · [`docs/projeto/escalabilidade.md`](../docs/projeto/escalabilidade.md)

## Pré-requisito

```bash
bash database/scripts/check.sh
npm run dev
```

Login padrão: `admin@amarante.local` / `amarante123`

## Níveis

| Nível | Para quê | VUs | Duração |
|-------|----------|-----|---------|
| **smoke** | Gate rápido | 5 | 5s |
| **normal** | Baseline | 20 | 12s |
| **heavy** | Stress | 50 | 25s |

## Como rodar

```bash
npm run test:smoke
node tests/load/run-node.mjs normal
node tests/load/run-node.mjs heavy
```

Rotas exercitadas: `/dashboard/summary`, `/requests/kanban`, `/products/base`, `/catalog/families`.

## k6 (opcional)

```bash
k6 run tests/load/auth-crud.js
```
