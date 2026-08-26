# Tabelas — Portal Amarante CSC

Domínio em **inglês**. Campos: [`docs/projeto/mapa-entidades.md`](../../docs/projeto/mapa-entidades.md) · schema Prisma.

| Tabela | Papel |
|--------|-------|
| `users` | Autenticação |
| `hotels` | Unidades hoteleiras |
| `groups`, `subgroups`, `families` | Hierarquia PDM |
| `products` | Itens cadastrados |
| `product_hotels` | Produto × hotel |
| `product_attributes`, `product_attribute_values` | Atributos PDM |
| `requests`, `request_items` | Solicitações de cadastro |
| `request_stages` | Timeline / SLA |
| `ncm_suggestions` | Candidatos NCM |
| `suppliers` | Fornecedores |
| `notifications` | Notificações usuário |
| `measure_units`, `warehouses`, `cost_centers` | Parametrização |
| `business_calendar` | Dias úteis SLA |
| `audit_log` | Auditoria DML (triggers) |

Triggers: [`triggers.md`](triggers.md).

**Removidas** (legado): `clients`, `orders`, `order_items`.
