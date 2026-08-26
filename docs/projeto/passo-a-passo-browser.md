# Passo a passo no browser — Portal Amarante CSC

Pré-requisito: API em `http://localhost:3000/api` e UI em `http://localhost:5173`. Fluxo completo: [`fluxo-aplicacao.md`](fluxo-aplicacao.md).

---

## Boot e auth

1. Vite serve `frontend/index.html`; `main.tsx` monta React + `amarante-tokens.css`.
2. `App.tsx`: `/login` pública; demais rotas sob `ProtectedRoute` + `AppShell`.
3. `AuthContext` chama `GET /api/auth/me` com `credentials: 'include'`.
4. Sem sessão → redirect `/login`. Login: `POST /api/auth/login` → cookies httpOnly.
5. Com sessão → `/home` (redirect de `/`).

**Credenciais dev:** `admin@amarante.local` / `amarante123`

---

## Navegação

6. AppShell: menu lateral colapsável (☰), submenus Produtos/Fornecedores/Parametrizações.
7. Home: texto centralizado `Olá, [Nome].` + `Seja bem-vindo!`
8. Produtos → Dashboard, Nova Solicitação, Caixa de Entrada, **Solicitações**, **Base**.

---

## Produtos — checklist manual

| # | Ação | Esperado |
|---|------|----------|
| 1 | Abrir `/produtos/solicitacoes` | Kanban ou lista com cards |
| 2 | Alternar board ↔ lista | Mesmos dados, layout diferente |
| 3 | Busca ao vivo | Filtra por texto |
| 4 | Filtros família/hotel/solicitante | MultiFilter aplica query |
| 5 | Abrir `/produtos/base` | Produtos ativos; filtro inativos/todos |
| 6 | `/produtos/caixa-de-entrada` | Itens pendentes do usuário |
| 7 | Clicar card → `/produtos/solicitacao/:id` | Detalhe carrega |

---

## API e sessão

9. Chamadas via `api.ts` — prefixo `/api`, `credentials: 'include'`.
10. 401 → tenta `POST /api/auth/refresh` uma vez.
11. Logout → `POST /api/auth/logout` → `/login`.

```text
Browser → AuthContext → /api/auth/me
  ├─ sem cookie → LoginPage
  └─ com cookie → AppShell → Home / Produtos / …
```

Token **nunca** em `localStorage`. API protegida por `JwtAuthGuard` global.
