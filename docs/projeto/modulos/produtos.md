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
| Base de produtos | `/produtos/base` | `print16`, `print17` — **ativos + inativos**; ordenação por coluna |

## Regras críticas

- **ITM-01** CAIXA ALTA
- **ITM-09** NCM confirmado (`ncm_codes` CHAR(8); FK; UI `9999.99.99`)
- **ITM-11** Lote mesma família
- **ItemKind** `CONSUMPTION` | `FIXED_ASSET` em `products` / `request_items` / `families` — árvores separadas; AF sem UM; consumo exige UM (CHECK no banco)
- Busca: `pg_trgm`, mínimo 3 caracteres
- Produto 1×N hotéis via `product_hotels`
- Código interno da solicitação (`requests.code`): número crescente só com dígitos (sem zeros à esquerda, máx. 10); gerado pelo sistema; busca e detalhes exibem esse ID, não o UUID
- Base original SAP (`sap_code` preenchido) não pode ser excluída; cadastros do portal podem ser excluídos só pelo administrador
- Hierarquia SAP B1: Família → Subgrupo → Grupo (texto + FK; sem códigos 1/3/6 Semplice); AF usa códigos AFF/AFS/AFG
- Campos patrimoniais AF5 (`asset_tag`, depreciação, etc.) — colunas nullable, sem regra inventada
- Sugestão NCM: score = **similaridade real** (`pg_trgm`) no histórico classificado — não escada sintética; filtro por `item_kind` do item (UC e AF separados). UI do aprovador: nome do item da base + código NCM, similaridade em **%**; campo Outro aceita só dígitos (formato 9999.99.99).
- Atributos PDM (demo): UI com **select** a partir de `examples` (SIM/NÃO, TIPO, EMBALAGEM fechados; MARCA/PESO com Outro). BEBIDAS usa embalagens de bebida no catálogo demo.

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

Pipeline (Produtos) — destino pela **família** do lote (**FLX-01**):

`SOLICITANTE` →

- Família **uso e consumo** → `APROVADOR` (**Aprovador - Administrativo**) → `ENCERRADO` (base UC)
- Família **ativo fixo** → `IMOBILIZADO` (**Aprovador - Imobilizado**) →
  - Flag **SIM** → permanece / registra na base AF → `ENCERRADO`
  - Flag **NÃO** → escolhe família UC sugerida → `APROVADOR` → …

Administrativo só encaminha ao Imobilizado se perceber erro de setor (escolhe família AF sugerida). O receptor pode alterar a família depois.

O solicitante **não** escolhe manualmente o destino: a família define o roteamento. Bases na UI: abas separadas em `/produtos/base`.

Rótulos de UI (nunca só “Aprovador”): ver `frontend/src/lib/requestLabels.ts`.

**Compliance não faz parte do fluxo de Produtos** — etapa reservada ao módulo Fornecedores.

Também: `RASCUNHO` · `RETORNO_SOLICITANTE` · `REPROVADO` · `ERRO_INTEGRACAO` · `EXPIRADA`

Tipos de solicitação: `INCLUSAO` · `ALTERACAO` · `BLOQUEIO`
(`BLOQUEIO_PARCIAL` / `BLOQUEIO_TOTAL` continuam no enum **só** para ler registros anteriores ao bloqueio unificado.)

### Busca de produto na base

`GET /api/products/search` casa **descrição** (similaridade `pg_trgm`, ≥ 3 caracteres) **ou** qualquer
código do produto: unificado, legado, SAP e NCM (≥ 2 caracteres; NCM aceita pontuação).
Código exato pontua 1.0 e prefixo 0.95 — sempre acima dos similares.
`active_only=true` restringe a itens ativos (usado no bloqueio).

Toda lista de produto exibe **bolinha de status**: verde = ativo, verde com base amarela = ativo com
bloqueio parcial, vermelha = inativo (`ProductStatusDot`).

### Alteração e bloqueio — formulário único pré-preenchido

Tela `/produtos/produto-existente`. O item já está cadastrado e classificado, então **não** há
pré-formulário de família/unidades: o formulário abre com o item **como está na base**.

**Alteração**
- Cada campo tem um lápis; edição libera o input daquele campo.
- Bloco “Resumo da alteração” lista automaticamente os campos alterados (`de → para`), com
  **Editar** (sobe até o campo) e **×** (descarta e volta ao valor da base).
- Justificativa obrigatória e **ao menos um campo alterado** — validado no front e no backend
  (`assertAlteracaoHasChanges`, comparação item × produto).
- Descrição longa, centro de custo e unidade de medida ausentes na base **não** são exigidos:
  a base legada quase não tem esses dados e exigi-los forçaria alteração artificial.
  Campo não informado numa alteração **mantém** o valor atual do produto (não apaga).

**Bloqueio**
- Busca traz **somente itens ativos** — bloquear item já inativo é recusado.
- Escopo por flags: **Requisição**, **Compras**, **Ambos** (mínimo uma).
  Uma flag = **parcial**; as duas = **total**.
- Motivo obrigatório. Formulário é somente leitura — bloqueio não altera cadastro.
- Na aprovação, o produto recebe `block_state` (`PARTIAL` \| `TOTAL`) e as colunas dedicadas
  `block_requisition` / `block_purchase` (exportáveis ao CRM).
  **Total** ⇒ `active = false`. **Parcial** ⇒ produto **segue ativo**, com o canal marcado bloqueado.
- O escopo entra na mensagem da etapa e no comparativo do aprovador.

**Unidades**

A solicitação abrange **todas as unidades do produto** — não há escolha de hotel. Quase nenhum
item da base SAP tem vínculo em `product_hotels`; nesse caso o cabeçalho mostra
“Unidades: todas as unidades” e a aprovação **não** cria o vínculo (não inventa dado de base).
Se o produto já tiver unidades vinculadas, elas são exibidas e preservadas.

- Solicitante escolhe família UC ou AF; o sistema rota automaticamente
- Match 100% / `pdm_signature`: **só CONSUMPTION** — bloqueia inclusão (ativos **e** inativos/bloqueados; msg própria se bloqueado)
- Constraint `UNIQUE(pdm_family_id, pdm_signature)` parcial para CONSUMPTION: migration detecta colisões antes; com legado sujo (41 dups) a unique fica **adiada** e o trigger impede **novas** duplicatas. Relatório: `base-sap/pdm-signature-collisions.md` + tabela `_pdm_signature_collisions`
- Formulário AF (após triagem): sem UM / qty compra / atributos PDM; obrigatórios `unitQuantity` + `physicalLocation`; contábeis opcionais (nullable)
- `GET /api/products/exact-count?q=&item_kind=` e filtro `item_kind` em `/products/search` e `/products/base`
- Devolução ao solicitante reinicia SLA (`POST /api/requests/:id/return-to-requester`) — Aprovador - Imobilizado ou Aprovador - Administrativo
- Encerrar sem promover à base (`POST /api/requests/:id/close` → `REPROVADO`): solicitante (rascunho/retorno, motivo opcional) ou aprovadores (motivo pré + observação obrigatória). Não reabre.
- Imobilizado classifica AF: flag **É ativo fixo? SIM | NÃO** no final da etapa (obrigatória). SIM → permanece no Imobilizado (caixa filtrada); opção de **registrar automaticamente** na base AF. NÃO → escolhe família UC sugerida → Administrativo. Bloco de NCM no Imobilizado **só aparece após SIM / já classificado como AF** (opcional na 1ª passagem; obrigatório ao registrar na base). API: `POST …/mark-fixed-asset` + `send-from-imobilizado` (`targetFamilyId` quando NÃO)
- Imobilizado conclui: `POST /api/requests/:id/send-from-imobilizado` (AF → base AF + encerra; UC → Administrativo com família sugerida)
- Aprovador - Administrativo: finalização com NCM (ITM-09). Em **INCLUSÃO com 2+ itens**, popup permite aprovar um/alguns/todos — **aprovação total** ou **parcial** (`APPROVAL_TOTAL` / `APPROVAL_PARTIAL`). Não selecionados são rejeitados na mesma ação; solicitação encerra. Em parcial, flag opcional devolve rejeitados escolhidos em **nova solicitação** (estado Solicitante, novo código, `parentRequestId`) via `returnRejectedItemIds`. API: `POST /api/requests/:id/approve` com `approvedItemIds` e `returnRejectedItemIds` opcionais. Encaminhar ao Imobilizado exige família AF sugerida (`reclassify-fixed-asset` + `targetFamilyId`).
- Caixa de entrada = etapas operacionais (Solicitante / Aprovador - Imobilizado / Aprovador - Administrativo)
- Ao concluir cada etapa: comentário obrigatório em `request_stages.message`

## API

| Endpoint | Uso |
|----------|-----|
| `GET /api/products/search` | Busca por descrição (similaridade) ou qualquer código; `item_kind`, `active_only` |
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
| `POST /api/requests/:id/approve` | Administrativo finaliza (opcional `approvedItemIds` para parcial em INCLUSÃO 2+) |
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
