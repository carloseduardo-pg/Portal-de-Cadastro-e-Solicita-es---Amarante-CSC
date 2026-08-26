# Análise técnica — Portal Amarante CSC

**Atualizado:** 2026-08-24

---

## Visão geral

Mono-repo modular: SPA React/Vite, API NestJS, PostgreSQL via Prisma. Domínio Amarante: hotéis, PDM (grupos/famílias/produtos), solicitações (`requests`), fornecedores, notificações e audit.

Integrações SAP/V360/CM preparadas no desenho mas **fora** do protótipo.

---

## Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Monólito modular | NestJS modules | Velocidade protótipo; padrão Prottus |
| Auth | JWT httpOnly | Segurança; skill reutilizável |
| ORM | Prisma | Migrations + type-safety |
| UI | CSS variables | Marca Amarante sem UI kit pesado |
| Busca similaridade | `pg_trgm` | Requisito ITM anti-duplicidade |

---

## Pendências técnicas

- POST completo para nova solicitação
- Módulos Fornecedores/Fiscal/Parametrizações — stubs
- CI/CD homolog Amarante

Ver [`modulos/STATUS_PROTOTIPO.md`](modulos/STATUS_PROTOTIPO.md).
