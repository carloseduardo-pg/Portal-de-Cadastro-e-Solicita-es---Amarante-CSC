# Requisitos — Amarante [CSC]

Sistema: **Portal de Cadastro & Solicitação** | Cliente: **Amarante CSC** | Desenvolvedora: **Prottus**

---

## 1. Visão

Portal com dois módulos: **Cadastro de Itens** (substitui Semplice) e **Fiscal** (alimenta V360). Resolve seis gargalos mapeados em campo com foco em usabilidade e prevenção de duplicidade, fila limpa, NCM assistido e cadastro em lote.

## 2. REGRAS INVIOLÁVEIS

| ID | Regra | Implementação |
|----|-------|---------------|
| **ITM-01** | Item em CAIXA ALTA | Trigger Postgres + normalização no input |
| **ITM-09** | NCM só com confirmação humana | `ncm_confirmed_by`; sem caminho alternativo |
| **ITM-11** | Lote = uma família | `requests.family_id`; bloqueio na UI |
| **FIS-04** | Fornecedor vê só seu CNPJ | Filtro obrigatório no módulo Fiscal |
| **FIS-17** | V360 permanece | Portal escreve no V360; não substitui operação |

## 3. Requisitos funcionais — Cadastro de Itens

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-ITM-01 | Busca por similaridade (`pg_trgm`) a partir de 3 caracteres | Alta |
| RF-ITM-02 | Exibir código ERP ao lado de cada item na busca | Alta |
| RF-ITM-03 | Impedir avanço sem declarar "nenhum serve" ou selecionar existente | Alta |
| RF-ITM-04 | Família preenche grupo e subgrupo automaticamente | Alta |
| RF-ITM-05 | Atributos dinâmicos por família (PDM) com exemplos | Alta |
| RF-ITM-06 | Descrição curta/longa com exemplo no rodapé | Média |
| RF-ITM-07 | Cadastro em lote (mesma família) | Alta |
| RF-ITM-08 | Rascunho com prazo visível e expiração | Alta |
| RF-ITM-09 | Fila só com solicitações que exigem ação | Alta |
| RF-ITM-10 | SLA em dias úteis com cores | Alta |
| RF-ITM-11 | Sugestão NCM com frequência de uso | Alta |
| RF-ITM-12 | Base: 1 produto, N hotéis | Alta |
| RF-ITM-13 | Indicador de possível duplicata na base | Média |
| RF-ITM-14 | Clonagem de solicitação | Baixa (Fase 2) |

## 4. Requisitos funcionais — Fiscal (TO-BE)

| ID | Requisito | Protótipo |
|----|-----------|-----------|
| RF-FIS-01 | Portal fornecedor: notas pendentes | Fora |
| RF-FIS-02 | Centro de custo via descrição serviço | Fora |
| RF-FIS-03 | Forma pagamento PIX/transferência/boleto | Fora |
| RF-FIS-04 | Notas sem cadastro | Fora |
| RF-FIS-05 | Notas extemporâneas (janela 1–25) | Fora |
| RF-FIS-06 | Item menu Fiscal desabilitado | Sim |

## 5. Requisitos funcionais — Fornecedores

| ID | Requisito | Protótipo |
|----|-----------|-----------|
| RF-FOR-01 | Replicar Semplice AS-IS (só CNPJ) | Sim |
| RF-FOR-02 | SLA igual produtos | Sim |
| RF-FOR-03 | Coluna `origin_base` (SEMPLICE \| CM) | Sim |
| RF-FOR-04 | Fluxo CPF/órgão/internacional/compliance | Fase 2 |

## 6. Requisitos não-funcionais

| ID | Requisito | Referência |
|----|-----------|------------|
| RNF-01 | JWT httpOnly, sem localStorage | `seguranca.md` |
| RNF-02 | UI sem emojis | `design-system.md` |
| RNF-03 | Domínio EN / UI PT | `especificacoes.md` |
| RNF-04 | Paginação em listagens | Padrão Prottus |
| RNF-05 | Auditoria de ações | `audit_log` |
| RNF-06 | Notificações acionáveis (não acumular ruído) | P12 |
| RNF-07 | UX como requisito de primeira ordem | Ata 18/08 |

## 7. Integrações (fora do protótipo)

SAP, V360, CM, Sienge (?) — credenciais e ambientes pendentes Amarante TI.

## 8. Critérios de aceite do protótipo

Ver checklist Parte 4 em `PROMPTS Prototipo Portal Amarante Cursor.md`:

- [ ] `npm run setup` sobe limpo
- [ ] Login JWT httpOnly
- [ ] Marca Amarante na UI
- [ ] Busca "agua" e "camisa masc almo" retorna similaridade
- [ ] Família deriva grupo/subgrupo
- [ ] CAIXA ALTA no banco
- [ ] Lote mesma família; bloqueio família diferente
- [ ] Fila com SLA colorido e aba Atrasadas
- [ ] NCM só com confirmação
- [ ] Base 1 produto × N hotéis

## 9. Pendências de decisão (PO)

1. Fluxo "USAR ESTE ITEM"
2. Auth fornecedor externo
3. Serviço → centro de custo (lista, livre ou motor)
4. Valor do Item / Quantidade Total de Compra
5. Sienge
6. Meta acerto NCM (%)
7. Prazo expiração rascunho
8. Amostra base + PDM atributos
