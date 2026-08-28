# Sessões — Cadu (Portal Amarante CSC)

**Repositório:** Portal Amarante CSC — Cadastro & Solicitação  
**Atualizado:** 2026-08-28

---

## Projeto

| Item | Valor |
|------|-------|
| Cliente | Amarante CSC |
| Produto | Portal substituindo Semplice |
| Homologação | 02/10/2026 |
| Stack | React 19 · NestJS 11 · Prisma · PostgreSQL |

---

## Entregas recentes

- **Import SAP B1:** `npm run import:sap` (`backend/prisma/import-sap.ts`) — 3.598 UC + 313 AF; hierarquia Família→Subgrupo→Grupo; relatório `base-sap/relatorio-importacao.md`
- **Ativo fixo:** flag `requests.fixed_asset` + etapa `IMOBILIZADO` + role `APROVADOR_IMOBILIZADO`; fluxo Solicitante → Imobilizado → Aprovador → Encerrado
- Roles: ADMIN / SOLICITANTE / APROVADOR / APROVADOR_IMOBILIZADO / COMPLIANCE — caixa por etapa; Admin vê todas
- Rascunho = etapa Solicitante; envio com modal (cancelar / rascunho / enviar)
- Fluxo padrão: Formulário → Solicitante → Aprovador → Encerrado (Compliance só Fornecedores)
- Atributos PDM de protótipo por família para testar o formulário até a base real Amarante
- Caixa de entrada: blocos Novas / Do dia / Atrasadas; filtros tipo e etapa
- Adaptação completa do template Prottus web para domínio Amarante
- Schema `amarante`, seed catálogo, módulos products/requests/catalog
- UI marca Amarante (tokens, logos vazados, AppShell colapsável)
- Produtos remodelado: Solicitações unificado + Base unificado
- **POST/PATCH solicitações** — rascunho e envio real com UM, centro de custo, origem e valor
- Lapidação Produtos: match 100%, devolução+SLA, bloqueios, SAP, typeahead, multi-links
- Documentação Amarante vigente em `docs/projeto/` (índice: README)
- Skills Cursor: `amarante-*`
- SQL de triggers Distac substituído por invariantes Amarante (ITM-01, ITM-09, audit, pg_trgm)

---

## Docs principais

- [`docs/projeto/README.md`](../docs/projeto/README.md)
- [`docs/projeto/modulos/STATUS_PROTOTIPO.md`](../docs/projeto/modulos/STATUS_PROTOTIPO.md)
- [`PROMPTS Prototipo Portal Amarante Cursor.md`](../../PROMPTS%20Prototipo%20Portal%20Amarante%20Cursor.md)
