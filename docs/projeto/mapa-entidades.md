# Mapa de entidades — Portal Amarante CSC

Domínio em **inglês** no código (Prisma, API, DTOs). Labels de UI em português.

Diagrama simplificado das entidades principais do protótipo.

---

## Cadastro de itens (PDM)

```
hotels ──┐
         ├── product_hotels ── products ── families ── subgroups ── groups
         │                         │
         │                         ├── product_attributes / product_attribute_values
         │                         └── ncm_suggestions
         │
requests ── request_items ── (products em rascunho)
    │
    └── request_stages (timeline / SLA)
```

| Entidade | Tabela | Descrição |
|----------|--------|-----------|
| Hotel | `hotels` | Unidades MCZ, MGI, JPT, SALG, MV4 |
| Grupo / Subgrupo / Família | `groups`, `subgroups`, `families` | Hierarquia PDM |
| Produto | `products` | Item único; descrição curta CAIXA ALTA |
| Produto × Hotel | `product_hotels` | N:N — um produto em vários hotéis |
| Atributos PDM | `product_attributes`, `product_attribute_values` | Por família |
| Solicitação | `requests` | Fluxo aprovação cadastro |
| Item da solicitação | `request_items` | Linhas / lote |
| Estágios | `request_stages` | Histórico status + SLA |
| Sugestão NCM | `ncm_suggestions` | Candidatos (≠ NCM confirmado); score = similaridade real |
| Catálogo NCM | `ncm_codes` | TIPI 8 dígitos; FK em `products` / `request_items` |

---

## Parametrização

| Entidade | Tabela |
|----------|--------|
| Unidade de medida | `measure_units` |
| Depósito | `warehouses` |
| Centro de custo | `cost_centers` |
| Calendário útil | `business_calendar` |

---

## Fornecedores (fase 2)

| Entidade | Tabela |
|----------|--------|
| Fornecedor | `suppliers` |
| Documentos / contatos | (extensível no schema) |

---

## Transversal

| Entidade | Tabela | Uso |
|----------|--------|-----|
| Usuário | `users` | Login JWT; flag `active` |
| Notificação | `notifications` | Caixa do usuário |
| Audit | `audit_log` | Triggers SQL (alterações sensíveis) |

---

## Regras de negócio (referência)

| Código | Regra |
|--------|-------|
| ITM-01 | Descrições em CAIXA ALTA |
| ITM-09 | NCM confirmado separado de sugestões |
| ITM-11 | Lote na mesma família |
| FIS-04 / FIS-17 | Escopo fiscal (módulo placeholder) |

Detalhes: [`requisitos/requisito.md`](requisitos/requisito.md).
