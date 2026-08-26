# Programação (Blank / APIs) — catálogo Prottus / Scriptcase

## 1. Quando usar

Lógica que **não** cabe bem em Form/Consulta/Gráfico gerados: integrações, páginas especiais, organogramas, mindmaps, disparos de e-mail/SMS/pagamento. Preferir app gerada sempre que o caso for CRUD/listagem/gráfico padrão; Blank é exceção justificada.

## 2. Variantes

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Aplicação Blank | Código PHP/HTML/JS livre no Scriptcase | Objetivo na spec; por que não Form/Grid; segurança de entrada |
| Mapa de vendas (FusionChart etc.) | Mapa analítico custom | Biblioteca e licença; paleta brand |
| Confirmação de e-mail | Fluxo de token/opt-in | Expiração; mensagens em português |
| Organograma | Hierarquia visual | Fonte de dados; permissões |
| Mindmaps no formulário | Ideação / árvore | Persistência definida |
| `sc_send_mail_api` / Mandrill (`sc_call_api`) | E-mail via API | Secrets em conexão/env; sem hardcode |
| `sc_send_sms` (simples / múltiplo) | SMS | Opt-in e custos; rate limit |
| APIs PayPal / PagSeguro | Pagamentos | Homolog vs prod; webhooks; sem secrets no Git |

## 3. Contrato Prottus

- Justificativa explícita para Blank vs. app gerada.
- Código e persistência em inglês; UI em português.
- Validar entradas; erros explícitos; logs sem PII/secrets.
- Visual: herdar tema/tokens quando a Blank renderizar UI.
- Documentar macros/APIs usadas e variáveis de ambiente (somente nomes).

## 4. Herança do projeto

- Prefixo `blank_` (ou acordo em `padrao-aplicacoes.md`)
- Conexões e APIs de `especificacoes.md`
- Tema quando houver UI
- Padrões de e-mail/SMS do projeto

## 5. DoD da aplicação

- [ ] Spec com motivo do Blank, fluxos e APIs
- [ ] Secrets fora do repositório
- [ ] Teste do fluxo feliz e falha de API
- [ ] Menu (se aplicável) + STATUS + agent
