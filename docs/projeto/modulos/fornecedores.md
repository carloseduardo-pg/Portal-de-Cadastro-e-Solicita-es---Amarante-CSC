# Módulo — Fornecedores

## Escopo do protótipo

Replicar o Semplice **AS-IS** com design Amarante. Apenas **Pessoa Jurídica (CNPJ)**.

## Fora do protótipo (Fase 2)

Fluxo completo do PDF oficial: CPF, órgão público, internacional, compliance, 4 status, formulário externo.

> TODO no código: especificação completa no PRD Parte V.

## Telas (espelho Semplice)

| Tela | Rota | Print |
|------|------|-------|
| Dashboard | `/fornecedores` | `Print2-Fornecedores-Dashbaord.png` |
| Nova solicitação | `/fornecedores/nova-solicitacao` | `Print3` |
| Caixa de entrada | `/fornecedores/caixa-de-entrada` | `Print4` |
| Todas solicitações | `/fornecedores/todas-solicitacoes` | `Print5` |
| Minhas solicitações | `/fornecedores/minhas-solicitacoes` | — |
| Base | `/fornecedores/base` | `Print7` |
| Detalhe | `/fornecedores/:id` | `Print9`, `Print10` |
| Inativos | `/fornecedores/inativos` | — |

## Melhorias vs Semplice

1. SLA em dias úteis com cor (igual produtos)
2. Rascunho com expiração
3. Coluna `origin_base`: `SEMPLICE` | `CM` (unificação PRD Seção 16)

## Modelos

- `suppliers` — document (CNPJ), corporate_name, origin_base, registration_complete
- `supplier_requests` — fluxo solicitação

## Regras

- **ITM-01** estendido: fornecedores também em CAIXA ALTA onde aplicável (campo 18/08)
- SLA fornecedor oficial PDF: 5+5+1 dias úteis (corrigir erro kick-off 2+3)

## Integração

Base unificada Semplice + CM. Atualização cadastral também ocorre no módulo Fiscal.
