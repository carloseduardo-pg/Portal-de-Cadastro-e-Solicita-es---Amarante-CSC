# Contribuindo — Portal Amarante CSC

Protótipo interno Prottus / Amarante CSC.

## Antes de mudar código

1. [`docs/projeto/contexto.md`](docs/projeto/contexto.md)
2. [`docs/projeto/especificacoes.md`](docs/projeto/especificacoes.md)
3. [`docs/projeto/fluxo-aplicacao.md`](docs/projeto/fluxo-aplicacao.md)
4. [`docs/projeto/seguranca.md`](docs/projeto/seguranca.md) · [`escalabilidade.md`](docs/projeto/escalabilidade.md)
5. **Não editar** `docs/prottus/`

## Checklist de PR

- [ ] `npm run lint`
- [ ] `npm run test` (backend)
- [ ] Smoke com API no ar: `npm run test:smoke`
- [ ] Sem secrets no git
- [ ] JSDoc + `FUNCTIONS.md` se export público novo
- [ ] Migration: nome descreve schema (nunca nome de pessoa)

## Cursor

Rules: `.cursor/rules/` · Skills: `.cursor/skills/` — [`.cursor/README.md`](.cursor/README.md)
