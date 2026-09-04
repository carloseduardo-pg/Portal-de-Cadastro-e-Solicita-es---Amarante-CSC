# Módulos — Portal Amarante CSC

Specs de negócio por área do portal. Código em inglês; UI em português.

---

## Índice

| Spec | Módulo | Menu | Status protótipo |
|------|--------|------|------------------|
| [`auth.md`](auth.md) | Autenticação | — | OK |
| [`produtos.md`](produtos.md) | Cadastro de itens | Produtos | Parcial |
| [`fornecedores.md`](fornecedores.md) | Fornecedores | Fornecedores | Placeholder |
| [`parametrizacoes.md`](parametrizacoes.md) | Parametrizações | Parametrizações | Placeholder |

Estado técnico detalhado: [`STATUS_PROTOTIPO.md`](STATUS_PROTOTIPO.md).

---

## Menu lateral (AppShell)

Ordem atual (itens somem conforme o papel):

1. **Home** — `/home`
2. **Produtos** — submenu (Nova Solicitação só quem cria)
3. **Fornecedores** — ADMIN e COMPLIANCE
4. **Parametrizações** — Administrativo (ADMIN); Produtos (ADMIN e aprovadores)
5. **Fiscal** — desabilitado; só ADMIN vê o item
6. **Suporte** — `/suporte`
7. **FAQ** — `/faq`
