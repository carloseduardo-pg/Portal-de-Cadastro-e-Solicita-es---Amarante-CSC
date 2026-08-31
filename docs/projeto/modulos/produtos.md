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
- **ITM-09** NCM confirmado (`ncm_codes` CHAR(8); FK; UI `9999.99.99`)
- **ITM-11** Lote mesma família
- **ItemKind** `CONSUMPTION` | `FIXED_ASSET` em `products` / `request_items` / `families` — árvores separadas; AF sem UM; consumo exige UM (CHECK no banco)
- Busca: `pg_trgm`, mínimo 3 caracteres
- Produto 1×N hotéis via `product_hotels`
- Hierarquia SAP B1: Família → Subgrupo → Grupo (texto + FK; sem códigos 1/3/6 Semplice); AF usa códigos AFF/AFS/AFG
- Campos patrimoniais AF5 (`asset_tag`, depreciação, etc.) — colunas nullable, sem regra inventada
- Sugestão NCM: score = **similaridade real** (`pg_trgm`) no histórico classificado — não escada sintética; filtro por `item_kind` do item (UC e AF separados)

## Sugestões de NCM — quando são geradas

`seedNcmSuggestions` apaga e reseia **fora** da transação (após commit). Momentos:

| Momento | Disparo |
|---------|---------|
| Criar já enviando à aprovação | `create` com `targetStage=APROVADOR` → chega em `IMOBILIZADO` |
| Atualizar rascunho e enviar | `update` com envio (não edição de aprovador) → `IMOBILIZADO` |
| Enviar da etapa Solicitante / Retorno | `POST …/send-to-approver` |
| Imobilizado marca como ativo fixo | `POST …/mark-fixed-asset` (recalcula contra base AF) |
| Imobilizado encaminha UC ao Administrativo | `send-from-imobilizado` (recalcula contra base UC) |
| Reclassificações AF ↔ UC | `reclassify-fixed-asset` / `reclassify-consumption` (já existentes) |

ITM-09 permanece: sugestão não preenche NCM automaticamente — confirmação humana obrigatória.

## Estados da solicitação

Pipeline (Produtos) — **toda solicitação** passa primeiro pelo Imobilizado (**FLX-01**):

`SOLICITANTE` → `IMOBILIZADO` (**Aprovador - Imobilizado**, triagem) →

- Se **não** for ativo fixo → `APROVADOR` (**Aprovador - Administrativo**) → `ENCERRADO` (base uso e consumo)
- Se **for** ativo fixo → permanece no Imobilizado → `ENCERRADO` (registro na base de ativos fixos; **não** passa pelo Administrativo)

O solicitante **não** escolhe uso e consumo × ativo fixo e **nunca** envia direto ao Administrativo (inclusive após rascunho ou retorno). Bases na UI: abas separadas em `/produtos/base`.

Rótulos de UI (nunca só “Aprovador”): ver `frontend/src/lib/requestLabels.ts`.

**Compliance não faz parte do fluxo de Produtos** — etapa reservada ao módulo Fornecedores.

Também: `RASCUNHO` · `RETORNO_SOLICITANTE` · `REPROVADO` · `ERRO_INTEGRACAO` · `EXPIRADA`

Tipos de solicitação: `INCLUSAO` · `ALTERACAO` · `BLOQUEIO_PARCIAL` · `BLOQUEIO_TOTAL`

- Solicitante cria sempre como consumo; famílias filtradas por `item_kind` na triagem
- Match 100% / `pdm_signature`: **só CONSUMPTION** — bloqueia inclusão (ativos **e** inativos/bloqueados; msg própria se bloqueado)
- Constraint `UNIQUE(pdm_family_id, pdm_signature)` parcial para CONSUMPTION: migration detecta colisões antes; com legado sujo (41 dups) a unique fica **adiada** e o trigger impede **novas** duplicatas. Relatório: `base-sap/pdm-signature-collisions.md` + tabela `_pdm_signature_collisions`
- Formulário AF (após triagem): sem UM / qty compra / atributos PDM; obrigatórios `unitQuantity` + `physicalLocation`; contábeis opcionais (nullable)
- `GET /api/products/exact-count?q=&item_kind=` e filtro `item_kind` em `/products/search` e `/products/base`
- Devolução ao solicitante reinicia SLA (`POST /api/requests/:id/return-to-requester`) — Aprovador - Imobilizado ou Aprovador - Administrativo
- Encerrar sem promover à base (`POST /api/requests/:id/close` → `REPROVADO`): solicitante (rascunho/retorno, motivo opcional) ou aprovadores (motivo pré + observação obrigatória). Não reabre.
- Imobilizado classifica AF: flag **É ativo fixo? SIM | NÃO** no final da etapa (obrigatória). SIM → permanece no Imobilizado (caixa filtrada); opção de **registrar automaticamente** na base AF. NÃO → Administrativo (UC). API: `POST …/mark-fixed-asset` + `send-from-imobilizado`
- Imobilizado conclui: `POST /api/requests/:id/send-from-imobilizado` (AF → base AF + encerra; UC → Administrativo)
- Aprovador - Administrativo pode editar campos na sua etapa; edições registradas na timeline
- Caixa de entrada = etapas operacionais (Solicitante / Aprovador - Imobilizado / Aprovador - Administrativo)
- Ao concluir cada etapa: comentário obrigatório em `request_stages.message`

## API

| Endpoint | Uso |
|----------|-----|
| `GET /api/products/search` | Busca similaridade (tela 1); opcional `item_kind` |
| `GET /api/products/exact-count` | Contagem por descrição exata (ativo fixo) |
| `GET /api/products/base` | Base ativos/inativos/todos; filtro `item_kind` (abas UC \| AF) |
| `GET /api/requests/kanban` | Board + lista unificada |
| `GET /api/requests/queue` | Caixa de entrada / fila |
| `GET /api/requests/:id` | Detalhe |
| `POST /api/requests` | Criar rascunho ou enviar solicitação |
| `PATCH /api/requests/:id` | Atualizar rascunho |
| `POST /api/requests/:id/return-to-requester` | Devolver ao solicitante (reset SLA) |
| `POST /api/requests/:id/close` | Encerrar sem base (`REPROVADO`; motivo pré + obs.) |
| `POST /api/requests/:id/mark-fixed-asset` | Imobilizado marca como AF (permanece na etapa) |
| `POST /api/requests/:id/send-from-imobilizado` | Imobilizado: AF → base AF; UC → Administrativo |
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
