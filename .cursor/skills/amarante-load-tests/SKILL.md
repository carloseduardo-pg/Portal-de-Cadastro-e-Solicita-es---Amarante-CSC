---
name: amarante-load-tests
description: >-
  Runs Portal Amarante load/security tests at smoke, normal, or heavy levels and
  interprets PASS/FAIL, 401, Helmet, latency, and 429 rate limits. Use when
  the user asks to test, load test, stress, smoke test, or validate security
  checks from the terminal.
---

# Amarante — testes smoke / normal / heavy

API no ar: `npm run dev` (ou `npm run dev:api`)  
Health: `http://127.0.0.1:3000/api/health`  
Login: `admin@amarante.local` / `amarante123`

```bash
npm run test:smoke
node tests/load/run-node.mjs normal
node tests/load/run-node.mjs heavy
```

Rotas: `/dashboard/summary`, `/requests/kanban`, `/products/base`, `/catalog/families`

**429 na carga = Throttler, não bug.**  
**fail** = HTTP ≠ 429 (ex.: 500).

Doc: `tests/README.md` · `backend/stress/README.md`
