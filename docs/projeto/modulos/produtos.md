# Módulo — Produtos (Cadastro de Itens)

Substitui o Semplice. Prioridade máxima do projeto.

## Gargalos que resolve

| # | Gargalo | Tela |
|---|---------|------|
| 1 | Duplicidade | Tela 1 — busca similaridade |
| 2 | Atributos PDM | Tela 2 — atributos por família |
| 3 | NCM manual | Tela 4 — sugestão assistida |
| 4 | Fila poluída | Tela 3 — caixa de entrada |
| 5 | Um item por formulário | Tela 2 — lote |
| 6 | Zero apoio fiscal | Tela 4 — candidatos NCM |

## Telas

| Tela | Rota | Prints |
|------|------|--------|
| Dashboard | `/produtos` | `print1-produtos-dashboard.png` |
| Nova solicitação (busca) | `/produtos/nova-solicitacao` | `print2`, `print3` |
| Dados do item | `/produtos/dados-do-item` | `print4`–`print7` |
| Caixa de entrada | `/produtos/caixa-de-entrada` | `print8`, `print12` |
| Detalhes / Aprovador | `/produtos/solicitacao/:id` | `print9`–`print11`, `print13` |
| Todas / Minhas solicitações | `/produtos/solicitacoes` | `print12`, `print15` — **unificado** |
| Base de produtos | `/produtos/base` | `print16`, `print17` — **ativos + inativos** |

## Regras críticas

- **ITM-01** CAIXA ALTA
- **ITM-09** NCM confirmado
- **ITM-11** Lote mesma família
- Busca: `pg_trgm`, mínimo 3 caracteres
- Produto 1×N hotéis via `product_hotels`
- Hierarquia derivada do código família (6→3→1 dígitos)

## Estados da solicitação

Pipeline principal (Produtos): `FORMULARIO` → `SOLICITANTE` ↔ `APROVADOR` (devolução) → `ENCERRADO`

**Compliance não faz parte do fluxo de Produtos** — etapa reservada ao módulo Fornecedores.

Também: `RASCUNHO` · `RETORNO_SOLICITANTE` · `REPROVADO` · `ERRO_INTEGRACAO` · `EXPIRADA`

Tipos de solicitação: `INCLUSAO` · `ALTERACAO` · `BLOQUEIO_PARCIAL` · `BLOQUEIO_TOTAL`

- Match 100% na base bloqueia inclusão (UI + API)
- Devolução ao solicitante reinicia SLA (`POST /api/requests/:id/return-to-requester`)
- Aprovador pode editar campos na etapa Aprovador; edições registradas na timeline
- Caixa de entrada = etapas operacionais (Solicitante / Aprovador)
- Ao concluir cada etapa: comentário obrigatório em `request_stages.message`

## API

| Endpoint | Uso |
|----------|-----|
| `GET /api/products/search` | Busca similaridade (tela 1) |
| `GET /api/products/base` | Base ativos/inativos/todos |
| `GET /api/requests/kanban` | Board + lista unificada |
| `GET /api/requests/queue` | Caixa de entrada / fila |
| `GET /api/requests/:id` | Detalhe |
| `POST /api/requests` | Criar rascunho ou enviar solicitação |
| `PATCH /api/requests/:id` | Atualizar rascunho |
| `POST /api/requests/:id/return-to-requester` | Devolver ao solicitante (reset SLA) |
| `PATCH /api/requests/items/:itemId/ncm` | Confirmação NCM (ITM-09) |
| `GET /api/catalog/hotels` · `families` · `groups` | Formulário / filtros |

`POST /api/requests` (persistir nova solicitação) ainda é parcial no protótipo.

## TODO (decisão PO)

- Fluxo após "USAR ESTE ITEM"
- Campos Valor do Item / Quantidade Total de Compra
- Coluna Histórico de Sienge
- Integração SAP (finalização)

## Entrega destino

SAP — item criado após aprovação Administrativo.
