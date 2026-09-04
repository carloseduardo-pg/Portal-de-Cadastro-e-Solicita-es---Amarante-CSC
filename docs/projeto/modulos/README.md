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

Ordem atual (itens somem conforme o papel):

1. **Home** — `/home`
2. **Fornecedores** — submenu (`suppliers.module`: ADMIN e COMPLIANCE)
3. **Produtos** — submenu (`products.module`; Nova Solicitação só com `products.request.create`)
4. **Fiscal** — desabilitado; só quem tem `users.manage` (ADMIN) vê o item
5. **Parametrizações** — Administrativo (`users.manage`); Produtos (`catalog.params`)
6. **Suporte** — `/suporte`
7. **FAQ** — `/faq`
