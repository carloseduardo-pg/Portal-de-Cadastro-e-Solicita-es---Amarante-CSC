# Checklist — novo projeto Prottus

Guia completo: **[COMO-INICIAR-UM-NOVO-PROJETO.md](../../COMO-INICIAR-UM-NOVO-PROJETO.md)**

**Não inicie código** antes do Gate do guia.

## Preparação (sempre)

- [ ] Passo 1 — padrão copiado; Cursor aberto; `imagens/` criada
- [ ] Caminho escolhido: **A** (docs base) ou **B** (manual)

## Caminho A — documentação base (recomendado)

- [ ] Materiais em `docs/projeto/documentacao-base/`
- [ ] Prompt A2 executado (docs/projeto + `padrao-aplicacoes.md` + apps + regras + agent + README produto)
- [ ] Prompt A3 — lacunas obrigatórias respondidas (se houver)
- [ ] Conferência A4 ok

## Caminho B — manual (se não houver docs base)

- [ ] B2 — `contexto.md`
- [ ] B3 — `especificacoes.md` (inclui Scriptcase se couber)
- [ ] B3b — `padrao-aplicacoes.md`
- [ ] B4 — `design-system.md`
- [ ] B5 — `mapa-entidades.md`
- [ ] B6 — `requisitos/requisito.md`
- [ ] B7 — `modulos/STATUS_PROTOTIPO.md` + READMEs de módulos e aplicações
- [ ] B8 — `.cursor/rules/projeto/{slug}.mdc`
- [ ] B9 — `.cursor/agents/cursor-{login}.md`
- [ ] B10 — README do produto + `.gitignore`

## Comum aos dois caminhos

- [ ] `docs/prottus/` (inclui `aplicacoes/`) e `.cursor/rules/prottus/` intactos
- [ ] Gate — checklist 100% (inclui `padrao-aplicacoes.md`)
- [ ] Prompt de liberação colado no Cursor

## Depois do gate

- [ ] Scaffold / primeiras apps conforme `especificacoes.md` + `padrao-aplicacoes.md` + catálogo `docs/prottus/aplicacoes/`
- [ ] Atualizar `STATUS_PROTOTIPO.md`, specs em `aplicacoes/` + sessão no agent
- [ ] (Opcional no repo do cliente) remover `COMO-INICIAR-UM-NOVO-PROJETO.md` — é guia do padrão, não do produto
