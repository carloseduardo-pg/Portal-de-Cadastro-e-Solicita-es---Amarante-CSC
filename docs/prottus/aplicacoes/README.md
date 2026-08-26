# Catálogo de aplicações — Prottus (Scriptcase-first)

Documento **mestre da empresa**. Define as famílias e variantes de aplicação que a Prottus constrói, alinhadas ao modelo [Scriptcase](https://www.scriptcase.com.br/exemplos/).

**Não** edite esta pasta no kickoff de um cliente. Métricas visuais e defaults do cliente ficam em `docs/projeto/padrao-aplicacoes.md`.

## Antes de criar qualquer aplicação

1. Escolher a **família** e a **variante** neste catálogo.
2. Ler `docs/projeto/padrao-aplicacoes.md` (tema, defaults, nomenclatura do projeto).
3. Ler `docs/projeto/design-system.md` (cores, tipografia, logo).
4. Confirmar stack/conexão em `docs/projeto/especificacoes.md`.
5. Criar/atualizar a spec em `docs/projeto/aplicacoes/`.

Não inventar layout solto fora do catálogo. Desvio pontual: só na spec da app, com justificativa.

## Famílias

| # | Família | Arquivo | Prefixo sugerido |
|---|---------|---------|------------------|
| 1 | Formulários | [01-formularios.md](01-formularios.md) | `frm_` |
| 2 | Relatórios / Consultas | [02-relatorios.md](02-relatorios.md) | `grid_` |
| 3 | Gráficos | [03-graficos.md](03-graficos.md) | `graf_` |
| 4 | Dashboards | [04-dashboards.md](04-dashboards.md) | `dash_` |
| 5 | Menus | [05-menus.md](05-menus.md) | `menu_` |
| 6 | Calendário | [06-calendario.md](06-calendario.md) | `cal_` |
| 7 | Programação (Blank / APIs) | [07-programacao.md](07-programacao.md) | `blank_` |
| 8 | Acessibilidade e i18n | [08-acessibilidade-i18n.md](08-acessibilidade-i18n.md) | (transversal) |

## Relação com módulos de negócio

- `docs/projeto/modulos/` — visão de **módulo de negócio** (área do sistema).
- `docs/projeto/aplicacoes/` — **aplicações Scriptcase** que compõem o módulo.
- Um módulo pode ter várias apps (ex.: `grid_` + `frm_` + `graf_`).

## Equivalência (outras stacks)

Quando a stack **não** for Scriptcase, mapear a família mais próxima (ex.: Formulário → tela CRUD; Consulta → listagem/relatório) e manter o **contrato Prottus** (tokens, UPPERCASE, obrigatórios, N:N). Detalhes de implementação ficam em `especificacoes.md`.

## Referência externa

Exemplos oficiais Scriptcase: https://www.scriptcase.com.br/exemplos/
