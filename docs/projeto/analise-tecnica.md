# Análise técnica — Portal Amarante CSC

**Atualizado:** 2026-09-04

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

- Fornecedores: persistência da nova solicitação CNPJ
- Fiscal e CRUD de usuários na UI
- CI/CD homolog Amarante

Ver [`modulos/STATUS_PROTOTIPO.md`](modulos/STATUS_PROTOTIPO.md).
