# Padrão de aplicações — Portal Amarante CSC

Toda nova tela segue este arquivo + o catálogo [`docs/prottus/aplicacoes/`](../prottus/aplicacoes/) (equivalência web).

Marca: [`design-system.md`](design-system.md). Stack: [`especificacoes.md`](especificacoes.md).

---

## 1. Plataforma

| Item | Valor |
|------|-------|
| Plataforma | Web custom (React 19 + NestJS 11) |
| Conexão BD | PostgreSQL `amarante` via `DATABASE_URL` |
| Login | `/login` + JWT cookies httpOnly |
| Pós-login | `/home` |
| Menu | AppShell colapsável: Home, Produtos, Fornecedores, Parametrizações, Suporte, FAQ |

Fiscal existe como rota stub; item do menu **desabilitado**.

---

## 2. Tema visual

| Item | Valor |
|------|-------|
| Tokens | `frontend/src/styles/amarante-tokens.css` |
| Primária | `#094111` |
| Secundária | `#7E975B` |
| Acento | `#F8AB2B` (alerta/SLA, não botão primário) |
| Tipografia | Source Sans 3 |
| Sidebar expandida | `public/marca/logo_vazado_completo.png` |
| Sidebar colapsada | `public/marca/logo_vazado_simples.png` |
| Login | Split 70/30 — foto + formulário sem card |
| Sidebar | Fundo branco; topbar verde escuro |

---

## 3. Defaults

| Família Prottus | Equivalente web |
|-----------------|-----------------|
| Formulário | Página ou modal; validação antes de salvar |
| Consulta | Tabela + busca ao vivo + filtros |
| Dashboard | KPIs + atalhos |
| Menu | AppShell com submenus e ícones |
| Kanban | Colunas por status (`SolicitacoesPage`) |
| Blank | Só com justificativa |

---

## 4. Convenções UI

- Títulos de módulo: **UPPERCASE** bold
- Zero emojis — `Icon.tsx`
- Obrigatórios: marcação visual + lista do que falta ao salvar
- Status ATIVO/INATIVO no criar e no editar
- Multi-select: tabela de junção (nunca CSV)
- Paginação: `PaginationBar` + `{ data, total, page, pageSize }`

---

## 5. Telas Produtos

| Tela | Rota |
|------|------|
| Dashboard | `/produtos` |
| Nova solicitação | `/produtos/nova-solicitacao` |
| Dados do item | `/produtos/dados-do-item` |
| Caixa de entrada | `/produtos/caixa-de-entrada` |
| Solicitações | `/produtos/solicitacoes` |
| Detalhe | `/produtos/solicitacao/:id` |
| Base | `/produtos/base` |

Spec: [`modulos/produtos.md`](modulos/produtos.md).
