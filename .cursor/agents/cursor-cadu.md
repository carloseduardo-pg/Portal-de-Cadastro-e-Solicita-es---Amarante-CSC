# Sessões — Cadu (Portal Amarante CSC)

**Repositório:** Portal Amarante CSC — Cadastro & Solicitação  
**Atualizado:** 2026-08-24

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

- Roles: ADMIN / SOLICITANTE / APROVADOR / COMPLIANCE — caixa por etapa; Admin vê todas
- Rascunho = etapa Solicitante; envio direto ao aprovador com modal (cancelar / rascunho / enviar)
- Fluxo de etapas: Formulário → Solicitante → Aprovador → Compliance → Encerrado; timeline + comentário
- Atributos PDM de protótipo por família para testar o formulário até a base real Amarante
- Caixa de entrada: blocos Todas / Novas / Do dia / Atrasadas; filtros tipo, itens e etapa (admin)
- Adaptação completa do template Prottus web para domínio Amarante
- Schema `amarante`, seed ~320 solicitações, módulos products/requests/catalog
- UI marca Amarante (tokens, logos vazados, AppShell colapsável)
- Produtos remodelado: Solicitações unificado + Base unificado
- **POST/PATCH solicitações** — rascunho e envio real com UM, centro de custo, origem e valor
- Kanban: ocultar vazias, filtro tipo, auto-expand lista, cores por etapa
- Documentação Amarante vigente em `docs/projeto/` (índice: README)
- Skills Cursor: `amarante-*`
- SQL de triggers Distac substituído por invariantes Amarante (ITM-01, ITM-09, audit, pg_trgm)

---

## Docs principais

- [`docs/projeto/README.md`](../docs/projeto/README.md)
- [`docs/projeto/modulos/STATUS_PROTOTIPO.md`](../docs/projeto/modulos/STATUS_PROTOTIPO.md)
- [`PROMPTS Prototipo Portal Amarante Cursor.md`](../../PROMPTS%20Prototipo%20Portal%20Amarante%20Cursor.md)
