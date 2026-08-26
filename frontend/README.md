# Frontend — Portal Amarante CSC

React 19 + Vite 8 + TypeScript. Marca Amarante (tokens + logos vazados). Sessão via cookies httpOnly.

Docs: [`../docs/projeto/design-system.md`](../docs/projeto/design-system.md) · [`../docs/projeto/padrao-aplicacoes.md`](../docs/projeto/padrao-aplicacoes.md)

---

## Estrutura

```
src/
  auth/           ProtectedRoute, contexto sessão
  components/     AppShell, DataTable, ícones, BrandLogo
  pages/          home, produtos, fornecedores, login, …
  lib/            api.ts (credentials: include)
  styles/         amarante-tokens.css, layout CRUD
public/marca/     logos Amarante (vazado completo/simples)
```

---

## Comandos

```bash
npm install
npm run dev      # :5173
npm run build
npm run lint
```

UI: http://127.0.0.1:5173

Login dev: `admin@amarante.local` / `amarante123`

---

## Rotas principais

Ver [`../docs/projeto/modulos/STATUS_PROTOTIPO.md`](../docs/projeto/modulos/STATUS_PROTOTIPO.md).

---

## Exports

Índice: [`FUNCTIONS.md`](FUNCTIONS.md).
