# Contexto do projeto — Amarante [CSC]

> Stack → [`especificacoes.md`](especificacoes.md) · Segurança → [`seguranca.md`](seguranca.md) · Escala → [`escalabilidade.md`](escalabilidade.md)

## Objetivo

**Portal de Cadastro & Solicitação** para o CSC da Amarante (rede hoteleira). Substitui o **Semplice** no cadastro de itens e alimenta o **V360** com informação fiscal coletada do fornecedor. Desenvolvido pela **Prottus** (PO: Carlos Eduardo / Cadu).

Este repositório usa o **Padrão Prottus** (stack web React + NestJS + Prisma).

## Cliente e operação

| Item | Valor |
|------|-------|
| Cliente | Amarante — CSC (Centro de Serviços Compartilhados) |
| Unidades | MCZ, MGI, JPT, SALG, MV4 Corporativo |
| Sistema legado (itens) | Semplice (SaaS terceiros) |
| Sistema fiscal | V360 (permanece; portal alimenta) |
| ERP destino | SAP |
| Portal antigo fornecedores | CM |
| Entrega homologação | 02/10/2026 |
| Prototipação | A partir de 24/08/2026 |

## Dois módulos, um portal

| Módulo | Quem usa | Substitui / alimenta |
|--------|----------|----------------------|
| **Cadastro de Itens** | Unidades + Administrativo CSC | Substitui Semplice → entrega SAP |
| **Fiscal** | Fornecedor (externo) + Fiscal CSC | Alimenta V360 (não substitui) |

Cadastro completo de fornecedores (CPF, órgão público, internacional, compliance) é **Fase 2**. Nesta entrega: fornecedores AS-IS (só CNPJ) + atualização cadastral no módulo Fiscal.

## Usuários

- **Solicitante (unidade):** busca item, preenche formulário, cadastro em lote por família.
- **Administrativo CSC:** fila, conferência, NCM assistido, finalização → SAP.
- **Fiscal CSC:** acompanhamento de notas (módulo Fiscal — protótipo com menu desabilitado).
- **Fornecedor externo:** completa centro de custo e pagamento (Fase posterior ao protótipo de telas internas).

## Os seis gargalos mapeados em campo

| # | Problema | Telas que resolvem |
|---|----------|-------------------|
| 1 | Itens cadastrados em duplicidade | Tela 1 — busca por similaridade |
| 2 | Falta de atributos por família (PDM) | Tela 2 — atributos dinâmicos |
| 3 | Busca manual de NCM | Tela 3 — sugestão de NCM |
| 4 | Fila poluída (rascunhos eternos) | Tela 3 — fila limpa + SLA |
| 5 | Um formulário por item | Tela 2 — lote mesma família |
| 6 | Zero apoio à classificação fiscal | Tela 3 — candidatos NCM |

**Constatação central (18/08):** o problema não é modelagem de dados — é usabilidade. UX é requisito de primeira ordem.

## REGRAS INVIOLÁVEIS

Estas cinco regras têm prioridade sobre qualquer outra decisão de implementação:

| ID | Regra |
|----|-------|
| **ITM-01** | Todo dado de item é gravado em **CAIXA ALTA**, independentemente de como for digitado. |
| **ITM-09** | O **NCM nunca é gravado** sem confirmação humana explícita. Não há exceção. |
| **ITM-11** | Uma solicitação em lote contém itens de **UMA ÚNICA família**. |
| **FIS-04** | O fornecedor externo acessa **exclusivamente** dados do próprio CNPJ. |
| **FIS-17** | O fluxo fiscal permanece no **V360** — o portal alimenta, não substitui. |

Mais 30 regras de negócio no Relatório Geral (Seção 12). Ver [`requisitos/requisito.md`](requisitos/requisito.md).

## Hierarquia de códigos (descoberta nos prints)

```
Grupo (1 dígito)     ex.: 1 — ALIMENTOS
SubGrupo (3 dígitos) ex.: 101 — CARNES E PRODUTOS AVICOLAS
Família → Subgrupo → Grupo (texto SAP + FK; códigos internos FAM/SUB/GRP).
ITM-11: um lote = uma família (nível amplo).

família(6) = subgrupo(3) + sequencial(3)
subgrupo(3) = grupo(1) + sequencial(2)
```

Grupo e subgrupo são **deriváveis** do código da família — sem tabela de-para.

## Escopo deste protótipo

- Login JWT httpOnly (padrão Prottus — sem reimplementar)
- Design System Amarante (sidebar branca, topbar verde)
- Schema Prisma domínio Amarante + seed realista
- AppShell + menu espelhando Semplice (+ Fiscal desabilitado)
- Telas P5–P12: produtos (busca, formulário, fila, NCM, base), parametrizações, fornecedores AS-IS, notificações, FAQ, suporte

## Fora de escopo (protótipo)

- Módulo Fiscal funcional (portal externo, integração V360)
- Cadastro de fornecedores Fase 2 (CPF, compliance, internacional)
- Integrações SAP / V360 / CM / Sienge
- Notificação WhatsApp/SMS

## Documentação de campo

Fonte primária: [`documentacao-base/Relatórios/Amarante/`](documentacao-base/Relat%C3%B3rios/Amarante/)

| Arquivo | Conteúdo |
|---------|----------|
| Relatório Geral do Projeto | Contexto, telas, 35 regras, cronograma |
| Relatório Kick Off 30.07 | Gargalos, fluxos, participantes |
| Ata campo 18.08 | Confirmação gargalos, caixa alta, lote por família |
| PPT/PDF fluxo oficial | Telas e campos TO-BE |
| Relatório Prottus interno | Riscos, divergências (não circula ao cliente) |

## Onde ler o quê

| Assunto | Arquivo |
|---------|---------|
| Specs técnicas | [`especificacoes.md`](especificacoes.md) |
| Requisitos | [`requisitos/requisito.md`](requisitos/requisito.md) |
| Módulos | [`modulos/`](modulos/) |
| Marca | [`design-system.md`](design-system.md) |
| Segurança | [`seguranca.md`](seguranca.md) |
| Prints Semplice | [`../../imagens/Imagens Semplice/`](../../imagens/Imagens%20Semplice/) |
| Prompts de execução | [`../../PROMPTS Prototipo Portal Amarante Cursor.md`](../../PROMPTS%20Prototipo%20Portal%20Amarante%20Cursor.md) |

## Pendências que exigem decisão do PO

1. Fluxo após "USAR ESTE ITEM" na Tela 1
2. Autenticação do fornecedor externo (FIS)
3. Como descrição de serviço vira centro de custo
4. Campos "Valor do Item" e "Quantidade Total de Compra" — usados ou mortos?
5. Integração **Sienge** (coluna existe no Semplice; não mapeada)
6. Meta de acerto do motor de NCM
7. Amostra oficial da base + PDM de atributos por família
8. Acessos SAP, V360, CM
