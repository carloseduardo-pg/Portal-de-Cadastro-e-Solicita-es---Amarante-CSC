# Sessões — Cadu (Portal Amarante CSC)

**Repositório:** Portal Amarante CSC — Cadastro & Solicitação  
**Atualizado:** 2026-08-31

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

- **Atributos PDM select + NCM UI:** atributos de família viram select (fechado ou +Outro); demo BEBIDAS com embalagem PET/vidro/lata. NCM candidatos: nome do item + código, similaridade em %, Outro só dígitos; seed grava `sourceProductId` do produto mais parecido.
- **Flag AF no Imobilizado:** triagem no final da etapa — **É ativo fixo? SIM|NÃO** (obrigatória). SIM → volta à caixa do Imobilizado com badge AF (opção registrar automático); NÃO → Administrativo. Removido seletor UC|AF do pré-form nessa etapa.
- **NCM no Imobilizado (FLX-01):** semeadura de sugestões alinhada ao fluxo — `create`/`update`/`sendToApprover` semeiam ao chegar em `IMOBILIZADO`; `markAsFixedAsset` reseia contra base AF; `seedNcmSuggestions` filtra por `item_kind`.
- **FLX-01 (Imobilizado-first):** solicitante nunca envia direto ao Administrativo — botão/labels e `sendToApprover` sempre → Imobilizado (também após rascunho). Regra gravada em `.cursor/rules/projeto/amarante.mdc`.
- **Fluxo Imobilizado-first + bases separadas:** Base de produtos com abas **Uso e consumo | Ativo fixo**. Solicitante não escolhe kind. Toda solicitação → Aprovador - Imobilizado. Se AF: permanece no Imobilizado e aprovação final registra na base AF (sem Administrativo). Se UC: encaminha ao Administrativo. API `POST …/mark-fixed-asset` + `send-from-imobilizado` reescrito.
- **Encerrar solicitação:** `POST /api/requests/:id/close` → `REPROVADO`. Solicitante (rascunho/solicitante/retorno): motivo opcional + confirmação. Aprovador - Imobilizado / Administrativo: motivo pré-definido + observação obrigatória. Aviso de não-reabertura. UI: `CloseRequestDialog`.
- **Rótulos de etapa de aprovador:** UI nunca mais mostra só “Aprovador” / “Imobilizado”. `IMOBILIZADO` → **Aprovador - Imobilizado**; `APROVADOR` → **Aprovador - Administrativo** (`requestLabels.ts`, badges, filtros, botões, diálogos).
- **Itens parecidos (Nova Solicitação):** colunas alinhadas ao Excel SAP — Código (legado), Descrição, Família, Subgrupo, Grupo, Código NCM, Unidade de medida (+ Unidades/Match). API `/products/search` passa a devolver `legacyCode`, hierarquia e UM.
- **Limpeza pós-SAP:** removidos 7 produtos de protótipo (sem `sap_code`), 11 solicitações de teste e hierarquia PDM legada (códigos 101001/MIG-*). Base restante: **3911** produtos SAP. Script: `backend/prisma/cleanup-prototype-products.ts`
- **Parametrizações — catálogo SAP real:** abas Famílias → Subgrupos → Grupos (amplo→específico); busca no servidor; `pageSize` catálogo até 500; colunas tipo (consumo/AF), pai e contagens; badges quarentena / TMP_* / grupo "Itens". **Cadastrar** desabilitado até decisão de política (árvore SAP).
- **NCM tipado (`ncm_codes`):** tabela CHAR(8) + FK em `products`/`request_items`; bootstrap **1.098** NCMs em uso; canônico sem pontuação, UI `9999.99.99`; import Receita preparado (`npm run import:ncm-receita`); score de sugestão = **similaridade real** (fim da escada sintética). Passivo fiscal: **176** ativos sem NCM na base carregada (análise oficial 225) — `base-sap/ncm-missing-active.md`
- **Trava de duplicidade por ItemKind:** `pdm_signature` + UNIQUE parcial `(pdm_family_id, pdm_signature)` só CONSUMPTION; migration listou **41 colisões** ativas e **adiou** a unique (não falha a carga); trigger impede novas dups. FIXED_ASSET = atalho AF2. Match passa a incluir inativos/bloqueados (`Existe um item idêntico bloqueado na base.`). Relatório: `base-sap/pdm-signature-collisions.md`
- **Reclassificação Aprovador ↔ Imobilizado:** `POST …/reclassify-fixed-asset` e `…/reclassify-consumption`; flags `return_to_approver` / `classification_invalidated`; Imobilizado edita árvore AF; se `return_to_approver=false` encerra sozinho (NCM + promote). Divisão de lote misto **não** implementada (exige todos os itens). Aceite: `backend/src/requests/RECLASSIFY_MANUAL_TEST.ts`
- **ItemKind (consumo × ativo fixo):** `ItemKind` em `families` / `products` / `request_items`; árvores AFF vs FAM; CHECK UM só em CONSUMPTION; campos AF5 nullable (sem regra); UI filtra famílias por kind; aceite PASS
- **Perf base:** self-join dups O(n²) → exact (btree) + near só na página (GIN `%`); `/base` ~100 ms (antes ~121 s)
- **Seed limpo:** só hotéis/users/UM/CC; catálogo via `import:sap`; attrs PDM = demo P3
- **Hierarquia SAP:** Família → Subgrupo → Grupo; produto só com `group_id`; códigos FAM/SUB/GRP (+ AFF/AFS/AFG); ITM-11 = família ampla
- **Import SAP B1:** `npm run import:sap` (`backend/prisma/import-sap.ts`) — 3.598 UC + 313 AF; relatório `base-sap/relatorio-importacao.md`
- Roles: ADMIN / SOLICITANTE / APROVADOR / APROVADOR_IMOBILIZADO / COMPLIANCE — caixa por etapa; Admin vê todas
- Rascunho = etapa Solicitante; envio com modal (cancelar / rascunho / enviar)
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

- [`docs/projeto/README.md`](../../docs/projeto/README.md)
- [`docs/projeto/modulos/STATUS_PROTOTIPO.md`](../../docs/projeto/modulos/STATUS_PROTOTIPO.md)
- [`PROMPTS Prototipo Portal Amarante Cursor.md`](../../PROMPTS%20Prototipo%20Portal%20Amarante%20Cursor.md)
