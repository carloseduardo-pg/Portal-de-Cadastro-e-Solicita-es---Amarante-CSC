# Sessões — Cadu (Portal Amarante CSC)

**Repositório:** Portal Amarante CSC — Cadastro & Solicitação  
**Atualizado:** 2026-09-09

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

- **Central de notificações:** modal grande — abas Não lidas / Lidas / Lixeira; **recuperar** (uma/todas); excluir uma ou esvaziar (aviso permanente); confirmação em todas as ações; fix z-index do ConfirmDialog acima do modal.
- **Setup DB respeita `.env`:** `setup.sh` / `check.sh` / `apply-triggers.sh` / `migrate.sh` leem `DATABASE_URL` (antes hardcoded `postgree`). Helper `_db_env.sh`.
- **Seed de usuários:** só contas CSC reais + `admin@amarante.local` (lab); demais `*.local` removidos do seed e desativados no re-seed.
- **Painel de notificações (UX):** título centralizado; abas **Não lidas** / **Lidas**; “Marcar todas” no rodapé; ícone do olho por item; **flags coloridas de etapa/tipo** (`notificationLabels` + mesma paleta da caixa).
- **Troca de família atualiza o formulário (UC ↔ AF):** em retorno/aprovador, `editFixedAsset` segue o `itemKind` da família escolhida; `hideMeasureUnit` não usa mais `request.fixedAsset` antigo — campos UM vs patrimoniais aparecem na hora.
- **Notificações no sininho:** painel expansível (não é tela `/notificacoes`). Criadas quando a solicitação entra na caixa do papel; `request_id` + dedupe; badge de não lidas.
- **Bloqueio de edição por presença:** quem abre a solicitação primeiro (`joined_at`) analisa/edita; outros veem formulário cinza só leitura (UI + API `409`). Libera ao sair da tela ou ao concluir etapa.
- **Merge `origin/dev` (Charlys) em `main`:** RBAC por capacidades (`capabilities.ts`, `CapabilitiesGuard`, menu/rotas). Mantido `.env.example`, produto-existente, seed sem demo em produção, mutações de catálogo só com `catalog.params`.
- **Higienização Distac + oficialização Amarante:** comentários Distac/`vendedor@` nos `.env` locais; banner de carga; porta UI **5180** em todos os guias; status/fluxos/rotas alinhados (inbox/queue, produto-existente, Parametrizações CRUD). Flag **É ativo fixo?** removida — destino e transferência só pela família. Seed demo não roda em `migrate` nem em produção; Swagger sem senha real.
- **Caixa de entrada — modo Lista em faixa:** pedido dos operadores (volume alto de solicitações). No modo **Lista** cada solicitação vira uma faixa de largura total, uma embaixo da outra, ordenada da **mais recente para a mais antiga**; blocos Novas / Do dia / Atrasadas mantidos. O modo **Quadro** segue igual (cards e FIFO por tempo na etapa).
- **Bloqueio unificado + formulário pré-preenchido (alteração/bloqueio):**
  - Busca de produto passa a casar **qualquer código** (unificado, legado, SAP, NCM) além da descrição; código exato = 100%, prefixo = 95%. Mínimo cai para 2 caracteres. Novo `active_only=true` (bloqueio só sobre item ativo).
  - `RequestType.BLOQUEIO` único; parcial × total vira flag. Migration `20260903180000_add_block_scope_flags` cria `block_requisition` / `block_purchase` em `requests` **e** `products` (colunas dedicadas para exportar ao CRM) e converte o histórico. `BLOQUEIO_PARCIAL/TOTAL` ficam no enum só para leitura.
  - Regras: mínimo 1 flag, motivo obrigatório, item já inativo recusado. Aprovação grava `block_state` + flags; **total** inativa o produto, **parcial** mantém ativo com o canal bloqueado.
  - Nova tela `/produtos/produto-existente`: abre o item como está na base. Alteração edita campo a campo pelo lápis, com resumo automático das mudanças (editar / descartar) e exige ≥ 1 campo alterado + justificativa (`assertAlteracaoHasChanges` no backend). Bloqueio é somente leitura, com as 3 flags e o motivo.
  - Descrição longa / centro de custo deixam de ser obrigatórios fora da inclusão (a base legada não tem esses dados); campo não informado numa alteração mantém o valor atual em vez de apagar.
  - `ProductStatusDot` (verde / verde-âmbar / vermelha) em toda lista de produto; comparativo do aprovador mostra o escopo do bloqueio.
- **Aprovação parcial — devolver rejeitados:** no popup Finalizar, flag para criar nova solicitação (rascunho/Solicitante) com itens rejeitados escolhidos (`returnRejectedItemIds`); novo código + `parentRequestId`.
- **Centros de custo só da planilha:** removido stub `A&B` do seed e do banco (FKs em itens/produtos zeradas). `import:catalog-real` agora apaga códigos fora da aba Centros de custo — restam **148** códigos reais.
- **Rótulos Encerrado → Aprovado/Reprovado:** na listagem Solicitações e detalhes, finalizadas exibem **Aprovado total** / **Aprovado parcial** (verde) ou **Reprovado** (vermelho); bloco KPI vira **Finalizadas**. Helpers em `requestLabels.ts` (`requestDestinationLabel` / `requestDestinationColor`).
- **FLX-01 roteamento por família:** UC → Administrativo; AF → Imobilizado. Transferências cruzadas exigem `targetFamilyId` sugerida (Imobilizado NÃO→UC; Admin→AF). Flag SIM|NÃO no Imobilizado mantida.
- **Código interno da solicitação:** `requests.code` numérico crescente (1, 2, 17… — sem zeros à esquerda, máx. 10 dígitos). Exibido na caixa, listagem, formulário e detalhes; pesquisável. UUID permanece só na URL.
- **Base de produtos — ordenação e exclusão de teste:** cabeçalhos clicáveis; botão **Mais recentes** (`createdAt desc`); `DELETE /api/products/:id` só ADMIN e só sem `sap_code` (base original SAP protegida).
- **Parametrizações — Hotéis e Unidade de medida:** mesmas colunas das demais abas (Nome, Código, Status ATIVO/INATIVO) + CRUD em modal (cadastrar, editar, inativar). API `POST/PATCH/DELETE /catalog/hotels` e `/catalog/measure-units`; inativação bloqueada com vínculos ativos.

- **Aprovação parcial/total (Administrativo):** INCLUSÃO 2+ itens → `ApproveItemsDialog`; subset à base + rejeitados na mesma ação; outcomes `APPROVAL_TOTAL` / `APPROVAL_PARTIAL` na timeline.
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
- **Parametrizações — base real + CRUD popup:** carga de `Centros de custo_Grupos de produto.xlsx` preparada (`npm run import:catalog-real`), aba **Centros de custo** no lugar de Armazéns, cadastro manual em modal para família/subgrupo/grupo/centro de custo (com dependências hierárquicas) e suporte a código real de grupo (`catalog_code`) pesquisável.
- **Parametrizações — CRUD básico completo:** ações por linha **Editar / Inativar** para família, subgrupo, grupo e centro de custo; backend com `PATCH/DELETE` em `/api/catalog/*` e validações de dependência ativa (bloqueia inativação/movimentação com produtos/solicitações em aberto).
- **Parametrizações — filtro de status:** subabas com seletor **Ativos / Inativos / Todos** ligado à API (`status=active|inactive|all`) para famílias, subgrupos, grupos, hotéis, centros de custo e unidades de medida.
- **Parametrizações — memória de filtro por aba:** status agora persiste por subaba em `localStorage` (cada aba lembra seu próprio Ativos/Inativos/Todos entre navegações e recarregamentos).
- **Parametrizações — persistência completa de contexto:** a tela também lembra `aba selecionada`, `busca por aba` e `tipo de item por aba PDM` (families/subgroups/groups), restaurando o contexto completo ao voltar para o módulo.
- **Higienização de warnings frontend:** correções em hooks/dependências e organização de exports para fast-refresh; `npm run lint --prefix frontend` final sem warnings.
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
