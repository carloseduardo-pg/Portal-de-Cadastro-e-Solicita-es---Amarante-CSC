# Especificações técnicas — Amarante [CSC]

Documento do **Portal de Cadastro & Solicitação** Amarante (stack Prottus web).

Metodologia universal: [`docs/prottus/metodologia.md`](../prottus/metodologia.md) — **não alterar**.  
Segurança: [`seguranca.md`](seguranca.md) · Escalabilidade: [`escalabilidade.md`](escalabilidade.md)

---

## 1. Arquitetura

| Decisão | Valor |
|---------|-------|
| Estilo | Modular Monolith + SPA |
| Repositório | Mono-repo Portal Amarante CSC |
| Containers | Não — Postgres e app locais |
| Camadas | Telas → Bases de dados → Integrações (SAP, V360, CM) |

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — TELAS                                       │
│  Cadastro Itens (interno) · Fiscal (externo + interno)  │
├─────────────────────────────────────────────────────────┤
│  CAMADA 2 — BASES                                       │
│  Itens/PDM · Fornecedores · Notas (espelho V360)        │
├─────────────────────────────────────────────────────────┤
│  CAMADA 3 — INTEGRAÇÕES                                 │
│  SAP ← itens · V360 ↔ notas · CM ← cadastro fornecedor  │
└─────────────────────────────────────────────────────────┘
```

Integrações reais ficam fora do protótipo; schema e TODOs preparados.

---

## 2. Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 · Vite 8 · TypeScript |
| Backend | NestJS 11 · TypeScript |
| Banco | PostgreSQL |
| ORM | Prisma 6 |
| Auth | JWT httpOnly (padrão Prottus — não reimplementar) |
| UI | CSS variables (`amarante-tokens.css`) |
| Busca | `pg_trgm` + GIN index em `description_short` |

---

## 3. Infra local

| Item | Valor |
|------|-------|
| Postgres | `127.0.0.1:5432` |
| API | `:3000` |
| UI | `:5173` |
| Database | `amarante` |
| Setup | `npm run setup` |

---

## 4. Domínio de dados (inglês no código)

### Cadastro de itens

| Modelo | Descrição |
|--------|-----------|
| `hotels` | MCZ, MGI, JPT, SALG, MV4 |
| `groups`, `subgroups`, `families` | Hierarquia PDM (códigos deriváveis) |
| `products` | Item único; descrições CAIXA ALTA |
| `product_hotels` | Relação produto × hotel (1 produto, N hotéis) |
| `product_attributes`, `product_attribute_values` | PDM por família |
| `requests`, `request_items` | Solicitações e itens |
| `request_stages` | Timeline / SLA |
| `ncm_suggestions` | Candidatos (separado de `ncm_code` confirmado) |
| `business_calendar` | Dias úteis para SLA |
| `measure_units`, `warehouses`, `cost_centers` | Parametrização |

### Fornecedores (Fase 2 parcial)

| Modelo | Descrição |
|--------|-----------|
| `suppliers` | Base unificada (origem SEMPLICE \| CM) |
| `supplier_requests` | Solicitações CNPJ AS-IS |

### Plataforma

| Modelo | Descrição |
|--------|-----------|
| `users` | Auth interna (flag `active`; RBAC ainda não modelado) |
| `notifications` | Sinalização acionável |
| `audit_log` | Auditoria (padrão Prottus) |

---

## 5. Invariantes de schema

- `requests.family_id` NOT NULL → ITM-11
- `products.ncm_code` NOT NULL exige `ncm_confirmed_by` NOT NULL — CHECK constraint (ITM-09)
- `description_short` / `description_long` em CAIXA ALTA — trigger Postgres (ITM-01)
- Extensão `pg_trgm` habilitada para busca por similaridade

---

## 6. Autenticação

| Item | Valor |
|------|-------|
| Interno | JWT httpOnly — login e-mail/senha |
| Externo (Fiscal) | **A definir** — trava módulo Fiscal |
| Guard | Global; `@Public()` só login/refresh/logout/health |

---

## 7. Integrações (TO-BE, fora do protótipo)

| Sistema | Direção | Uso |
|---------|---------|-----|
| SAP | Portal → SAP | Item cadastrado após aprovação |
| V360 | ↔ | Notas, centro de custo, pagamento |
| CM | Portal → CM | Atualização cadastral fornecedor |
| Sienge | ? | Coluna no Semplice; **não mapeado** |

---

## 8. Convenções deste repo

| Área | Convenção |
|------|-----------|
| Pastas | `frontend/`, `backend/`, `database/`, `docs/`, `imagens/` |
| Docs campo | `docs/projeto/documentacao-base/` |
| Prints | `imagens/Imagens Semplice/` |
| Logos | `frontend/public/marca/` |
| Tokens | `frontend/src/styles/amarante-tokens.css` |
| UI | Sem emojis; componente `Icon` |
| Slug rule | `amarante` |

---

## 9. Telas do protótipo

| # | Tela | Rota |
|---|------|------|
| — | Home | `/home` |
| — | Dashboard produtos | `/produtos` |
| 1 | Busca / prevenção duplicidade | `/produtos/nova-solicitacao` |
| 2 | Dados do item | `/produtos/dados-do-item` |
| 3 | Caixa de entrada | `/produtos/caixa-de-entrada` |
| — | Solicitações (kanban + lista) | `/produtos/solicitacoes` |
| 4 | Detalhes / NCM | `/produtos/solicitacao/:id` |
| 5 | Base produtos (ativos/inativos) | `/produtos/base` |
| — | Parametrizações | `/parametrizacoes/*` |
| — | Fornecedores | `/fornecedores/*` |
| — | Fiscal | menu desabilitado |

Referência visual: prints em `imagens/Imagens Semplice/`.
