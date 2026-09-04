# Módulos — Portal Amarante CSC

Specs de negócio por área do portal. Código em inglês; UI em português.

---

## Índice

| Spec | Módulo | Menu | Status protótipo |
|------|--------|------|------------------|
| [`auth.md`](auth.md) | Autenticação | — | OK |
| [`produtos.md`](produtos.md) | Cadastro de itens | Produtos | OK |
| [`fornecedores.md`](fornecedores.md) | Fornecedores | Fornecedores | Parcial |
| [`parametrizacoes.md`](parametrizacoes.md) | Parametrizações | Parametrizações | CRUD de catálogo |

Estado técnico detalhado: [`STATUS_PROTOTIPO.md`](STATUS_PROTOTIPO.md).

---

## Menu lateral (AppShell)

Ordem atual:

1. **Home** — `/home`
2. **Fornecedores** — submenu
3. **Produtos** — submenu (Dashboard, Nova Solicitação, Caixa de Entrada, Solicitações, Base)
4. **Fiscal** — desabilitado no menu (rotas placeholder existem)
5. **Parametrizações** — submenu
6. **Suporte** — `/suporte`
7. **FAQ** — `/faq`
