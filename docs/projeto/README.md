# Documentação — Portal Amarante CSC

Índice vigente. Leia nesta ordem ao entrar no projeto.

---

## Ordem de leitura

| # | Documento | Para quê |
|---|-----------|----------|
| 1 | [`contexto.md`](contexto.md) | Problema, escopo, integrações |
| 2 | [`especificacoes.md`](especificacoes.md) | Stack, infra, modelos, comandos |
| 3 | [`design-system.md`](design-system.md) | Cores, tipografia, logos |
| 4 | [`modulos/README.md`](modulos/README.md) | Módulos e menu |
| 5 | [`modulos/STATUS_PROTOTIPO.md`](modulos/STATUS_PROTOTIPO.md) | Pronto vs placeholder |
| 6 | [`requisitos/requisito.md`](requisitos/requisito.md) | Requisitos e regras ITM/FIS |

---

## Operação técnica

| Documento | Conteúdo |
|-----------|----------|
| [`ARQUITETURA.md`](ARQUITETURA.md) | Camadas, módulos API, fluxo HTTP |
| [`fluxo-aplicacao.md`](fluxo-aplicacao.md) | Jornada usuário e telas |
| [`mapa-entidades.md`](mapa-entidades.md) | Entidades Prisma |
| [`padrao-aplicacoes.md`](padrao-aplicacoes.md) | Convenções UI |
| [`passo-a-passo-browser.md`](passo-a-passo-browser.md) | Checklist manual |
| [`seguranca.md`](seguranca.md) | JWT, cookies, Helmet, audit |
| [`escalabilidade.md`](escalabilidade.md) | Paginação, índices, carga |
| [`analise-tecnica.md`](analise-tecnica.md) | Decisões do protótipo |
| [`database/README.md`](database/README.md) | Ponte para `database/` na raiz |

---

## Módulos de negócio

| Spec | Módulo |
|------|--------|
| [`modulos/auth.md`](modulos/auth.md) | Login e sessão |
| [`modulos/produtos.md`](modulos/produtos.md) | Itens, PDM, solicitações |
| [`modulos/fornecedores.md`](modulos/fornecedores.md) | Fornecedores (fase 2) |
| [`modulos/parametrizacoes.md`](modulos/parametrizacoes.md) | Famílias, hotéis, calendário |

---

## Campo (cliente)

[`documentacao-base/`](documentacao-base/) — relatórios e atas. Não substitui as specs acima.

Prints Semplice: `imagens/Imagens Semplice/` (fluxo de referência, não identidade visual).

---

## READMEs por camada

| Pasta | README |
|-------|--------|
| Raiz | [`../../README.md`](../../README.md) |
| Backend | [`../../backend/README.md`](../../backend/README.md) |
| Frontend | [`../../frontend/README.md`](../../frontend/README.md) |
| Database | [`../../database/README.md`](../../database/README.md) |
| Testes | [`../../tests/README.md`](../../tests/README.md) |

---

## O que não usar

| Item | Motivo |
|------|--------|
| `docs/prottus/` | Metodologia da empresa — **não editar** |
| `PROMPTS Prototipo Portal Amarante Cursor.md` | Plano histórico P0–P12. Já executado. Não é spec vigente |
| Specs Scriptcase de outro produto | Este portal é React, não Scriptcase |
| Documentação de vendas internas (clientes/pedidos) | Fora do domínio Amarante — **removida** |

Arquivos que existiam no template original (clientes, pedidos, hub de vendedor, anotações de código, guias de clone) foram **apagados**. Não recriar. O mapa atual é este README.
