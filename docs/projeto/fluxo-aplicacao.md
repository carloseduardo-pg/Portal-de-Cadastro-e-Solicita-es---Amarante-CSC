# Fluxo da aplicação — Portal Amarante CSC

Jornada principal do usuário interno (cadastro de itens). Fiscal e fornecedores seguem fluxo similar quando implementados.

---

## 1. Acesso

1. Usuário abre `/login`
2. Informa e-mail e senha → `POST /api/auth/login`
3. Cookies httpOnly (`access_token`, `refresh_token`) — **sem token em localStorage**
4. Redirecionamento para `/home` — saudação personalizada

Refresh automático via interceptor em `api.ts` quando access expira.

---

## 2. Home

- Rota: `/home`
- Mensagem: `Olá, [Nome].` + `Seja bem-vindo!`
- Navegação pelo menu lateral (colapsável ☰)

---

## 3. Módulo Produtos

### 3.1 Dashboard

- Rota: `/produtos`
- KPIs e atalhos (resumo API dashboard)

### 3.2 Nova solicitação

1. `/produtos/nova-solicitacao` — tipo (inclusão / alteração / bloqueio) + busca por descrição ou código
2. Inclusão → `/produtos/dados-do-item` — formulário PDM por família, lote (ITM-11)
3. Alteração / bloqueio → `/produtos/produto-existente` — formulário pré-preenchido da base
4. Submissão → `POST /api/requests` (rascunho ou envio ao aprovador definido pela família)

### 3.3 Caixa de entrada

- Rota: `/produtos/caixa-de-entrada`
- Itens aguardando ação do usuário logado
- API: `GET /api/requests/inbox`

### 3.4 Solicitações (unificado)

- Rota: `/produtos/solicitacoes`
- Substitui antigas "Todas" e "Minhas"
- Modos: **Quadro** e **Lista** (lista = uma faixa por solicitação, mais recente no topo)
- Filtros: busca ao vivo, família, hotel, solicitante
- API: `GET /api/requests/queue`

### 3.5 Detalhe / aprovação

- Rota: `/produtos/solicitacao/:id`
- Timeline, NCM (ITM-09), ações aprovador

### 3.6 Base de produtos (unificado)

- Rota: `/produtos/base`
- Substitui antigas "Base" e "Inativos"
- Filtro status: ativos / inativos / todos
- Busca e filtros família/hotel
- API: `GET /api/products/base`

---

## 4. Demais módulos (protótipo)

| Módulo | Estado |
|--------|--------|
| Fornecedores | Telas + API de consulta; nova solicitação sem persistência |
| Parametrizações | CRUD de catálogo em `/parametrizacoes/produtos` |
| Fiscal | Menu desabilitado; rotas stub |
| FAQ | Conteúdo operacional |
| Suporte | Página de contato (canal oficial ainda não definido) |
| Notificações | Sininho na topbar (painel) — avisos da caixa de entrada |

---

## 5. Logout

- Ação no AppShell → `POST /api/auth/logout` → limpa cookies → `/login`

---

## Redirects de rotas antigas

| Rota antiga | Nova rota |
|-------------|-----------|
| `/produtos/todas-solicitacoes` | `/produtos/solicitacoes` |
| `/produtos/minhas-solicitacoes` | `/produtos/solicitacoes` |
| `/produtos/inativos` | `/produtos/base` |
