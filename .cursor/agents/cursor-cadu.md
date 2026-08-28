# Sessões — Cadu (Portal Amarante CSC)

**Repositório:** Portal Amarante CSC — Cadastro & Solicitação  
**Atualizado:** 2026-08-28

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

- **Itens parecidos (Nova Solicitação):** colunas alinhadas ao Excel SAP — Código (legado), Descrição, Família, Subgrupo, Grupo, Código NCM, Unidade de medida (+ Unidades/Match). API `/products/search` passa a devolver `legacyCode`, hierarquia e UM.
- **Limpeza pós-SAP:** removidos 7 produtos de protótipo (sem `sap_code`), 11 solicitações de teste e hierarquia PDM legada (códigos 101001/MIG-*). Base restante: **3911** produtos SAP. Script: `backend/prisma/cleanup-prototype-products.ts`
- **Parametrizações — catálogo SAP real:** abas Famílias → Subgrupos → Grupos (amplo→específico); busca no servidor; `pageSize` catálogo até 500; colunas tipo (consumo/AF), pai e contagens; badges quarentena / TMP_* / grupo "Itens". **Cadastrar** desabilitado até decisão de política (árvore SAP).
- **NCM tipado (`ncm_codes`):** tabela CHAR(8) + FK em `products`/`request_items`; bootstrap **1.098** NCMs em uso; canônico sem pontuação, UI `9999.99.99`; import Receita preparado (`npm run import:ncm-receita`); score de sugestão = **similaridade real** (fim da escada sintética). Passivo fiscal: **176** ativos sem NCM na base carregada (análise oficial 225) — `base-sap/ncm-missing-active.md`
- **Trava de duplicidade por ItemKind:** `pdm_signature` + UNIQUE parcial `(pdm_family_id, pdm_signature)` só CONSUMPTION; migration listou **41 colisões** ativas e **adiou** a unique (não falha a carga); trigger impede novas dups. FIXED_ASSET = atalho AF2. Match passa a incluir inativos/bloqueados (`Existe um item idêntico bloqueado na base.`). Relatório: `base-sap/pdm-signature-collisions.md`
- **Reclassificação Aprovador ↔ Imobilizado:** `POST …/reclassify-fixed-asset` e `…/reclassify-consumption`; flags `return_to_approver` / `classification_invalidated`; Imobilizado edita árvore AF; se `return_to_approver=false` encerra sozinho (NCM + promote). Divisão de lote misto **não** implementada (exige todos os itens). Aceite: `backend/src/requests/RECLASSIFY_MANUAL_TEST.ts`
- **UX ativo fixo no mesmo fluxo:** escolha Uso e consumo | Ativo fixo na nova solicitação; match 100% em AF não bloqueia (banner N unidades + atalhos); formulário AF sem UM/PDM/qty compra, com unitQuantity + localização + contábeis opcionais; `GET /products/exact-count` + filtro `item_kind` na busca
- **ItemKind (consumo × ativo fixo):** `ItemKind` em `families` / `products` / `request_items`; árvores AFF vs FAM; CHECK UM só em CONSUMPTION; campos AF5 nullable (sem regra); UI filtra famílias por kind; aceite PASS
- **Perf base:** self-join dups O(n²) → exact (btree) + near só na página (GIN `%`); `/base` ~100 ms (antes ~121 s)
- **Seed limpo:** só hotéis/users/UM/CC; catálogo via `import:sap`; attrs PDM = demo P3
- **Hierarquia SAP:** Família → Subgrupo → Grupo; produto só com `group_id`; códigos FAM/SUB/GRP (+ AFF/AFS/AFG); ITM-11 = família ampla
- **Import SAP B1:** `npm run import:sap` (`backend/prisma/import-sap.ts`) — 3.598 UC + 313 AF; relatório `base-sap/relatorio-importacao.md`
- **Ativo fixo:** flag `requests.fixed_asset` + etapa `IMOBILIZADO` + role `APROVADOR_IMOBILIZADO`; fluxo Solicitante → Imobilizado → Aprovador → Encerrado
- Roles: ADMIN / SOLICITANTE / APROVADOR / APROVADOR_IMOBILIZADO / COMPLIANCE — caixa por etapa; Admin vê todas
- Rascunho = etapa Solicitante; envio com modal (cancelar / rascunho / enviar)
- Fluxo padrão: Formulário → Solicitante → Aprovador → Encerrado (Compliance só Fornecedores)
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
