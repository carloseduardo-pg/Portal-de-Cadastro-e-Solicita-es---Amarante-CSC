---
description: Metodologia e padrões de desenvolvimento da Prottus (mestre empresa — agnóstico de stack)
---

# Metodologia de Desenvolvimento — Prottus

Documento **mestre da empresa**. Universal para **todos** os projetos Prottus com vibe coding e LLMs (Cursor e demais agentes).

Define **como** desenvolvemos: princípios, descoberta, qualidade, documentação e comunicação com IA.

**Não** define stack tecnológica. Linguagens, arquitetura, infra e deploy ficam em `docs/projeto/especificacoes.md` de cada cliente.

---

## O que é universal vs o que é do projeto

| Universal (esta pasta `docs/prottus/`) | Específico do projeto (`docs/projeto/`) |
|----------------------------------------|------------------------------------------|
| Princípios (segurança, simplicidade) | Contexto e objetivo do cliente |
| FAROL / DOP | Requisitos de negócio |
| Métricas e qualidade | Stack, arquitetura, infra, deploy |
| Padrões de UI/UX Prottus | Marca (cores, logo) |
| Catálogo de aplicações (Scriptcase-first) | `padrao-aplicacoes.md` (tema, defaults, nomenclatura) |
| Abordagem de mapa de entidades | Domínio / entidades do cliente |
| Playbook de módulos e de aplicações | Specs em `modulos/` + `aplicacoes/` |
| Vibe coding / sessões Cursor | Regras `.cursor/rules/projeto/` |

---

## Princípios fundamentais

### 1. Segurança (prioridade máxima)
- Nunca commitar credenciais, senhas ou tokens no código
- Usar variáveis de ambiente / secret managers para dados sensíveis
- Validar e sanitizar entradas
- Autenticação e autorização adequadas ao risco do sistema
- Tráfego sensível criptografado (HTTPS/TLS)
- Logs sem dados sensíveis
- Revisar dependências e superfície de ataque regularmente

### 2. Simplicidade (prioridade alta)
- Código legível e direto
- Evitar over-engineering
- Preferir soluções claras
- Documentar decisões complexas (ADRs leves quando necessário)

### 3. Clareza de linguagem e nomenclatura
- Código e persistência: nomenclatura em **inglês**
- UI e documentação de negócio: **português**
- Seguir idioms e linters da **stack do projeto** (definida em `especificacoes.md`)
- Tipagem forte quando a linguagem permitir

### 4. Documentação de código
- Toda função/API/componente **exportado** deve ter documentação de intenção (JSDoc, docstrings, etc. — conforme a stack)
- Manter índice de exports do projeto (ex.: `FUNCTIONS.md` ou equivalente acordado nas especificações)
- Comentários objetivos em português quando agregarem contexto de negócio

---

## Métricas e padrões de qualidade

Aplicáveis a qualquer stack. O projeto define *como* medir (ferramentas) em `especificacoes.md`; os **critérios** abaixo são da Prottus.

### Qualidade de entrega
- Nenhum merge/entrega de módulo sem: build/typecheck (ou equivalente), revisão humana do código gerado por IA, docs atualizadas
- Critérios de aceite da tela/feature alinhados ao requisito e ao mapa de entidades
- Zero emojis na UI de produto — ícones vetoriais via componente padrão do projeto
- Campos obrigatórios validados antes de persistir; feedback claro ao usuário listando o que falta

### Qualidade de código
- Funções/módulos com responsabilidade clara
- Erros tratados explicitamente — não silenciar falhas
- Sem credenciais ou secrets no repositório
- Dependências justificadas (evitar bibliotecas “por hábito”)

### Qualidade de processo
- Descoberta registrada (DOP/FAROL) antes de inventar regra de negócio
- Sessões significativas de IA registradas em `.cursor/agents/cursor-{usuario}.md`
- Spec de módulo em `docs/projeto/modulos/` e de app em `docs/projeto/aplicacoes/` quando priorizado
- Defaults de apps em `docs/projeto/padrao-aplicacoes.md` respeitados
- Status do protótipo atualizado ao entregar

### Performance e operação
- Otimizar com evidência (medir antes)
- Fluxos críticos do usuário devem ser responsivos no contexto acordado com o cliente
- Observabilidade mínima: logs úteis de erro e falhas de integração (sem PII)

### Definition of Done (módulo / aplicação)

- [ ] Regra de negócio validada com requisito/DOP
- [ ] Tipo/variante escolhidos em `docs/prottus/aplicacoes/` e defaults de `docs/projeto/padrao-aplicacoes.md` aplicados
- [ ] Persistência e API (ou camada equivalente / apps Scriptcase) conforme especificações do projeto
- [ ] UI alinhada ao DS Prottus + marca do cliente (+ tema Scriptcase quando couber)
- [ ] Spec em `docs/projeto/aplicacoes/` (e módulo em `docs/projeto/modulos/` quando aplicável)
- [ ] Documentação de exports atualizada (se a stack exigir)
- [ ] STATUS_PROTOTIPO atualizado
- [ ] Sessão registrada (se trabalho significativo com agente)
- [ ] Build/checagens da stack passando (gerar/executar no Scriptcase ou equivalente)

---

## Metodologia de descoberta

### Método FAROL
- **F**atos — Como funciona hoje  
- **A**nomalias — Problemas conhecidos  
- **R**iscos — Impactos potenciais  
- **O**portunidades — Melhorias  
- **L**imitações — Restrições a respeitar  

### DOP (Descoberta Orientada por Perguntas)
Instrumento padrão de entrevistas e campo. Material vivo em `docs/projeto/requisitos/`.

### Kickoff a partir de documentação prévia (Caminho A)
Na Prottus a descoberta costuma existir **antes** do código. Os materiais brutos (entrevistas, atas, briefs, specs) sobem em `docs/projeto/documentacao-base/`. No kickoff, o agente consolida isso em `docs/projeto/` e só pergunta lacunas obrigatórias.  
Passo a passo: `COMO-INICIAR-UM-NOVO-PROJETO.md` (Caminho A).

---

## Tecnologias e arquitetura

**Não há stack única da Prottus.** Cada projeto documenta em `docs/projeto/especificacoes.md`:

- Arquitetura (monólito, serviços, serverless, Scriptcase, etc.)
- Linguagens e frameworks (ou versão/projeto Scriptcase)
- Banco(s) e padrões de acesso a dados
- Hospedagem / CI/CD (VPS, Vercel, containers, publicação SC, etc.)
- Autenticação, integrações, restrições de ambiente

O catálogo de tipos de app é Scriptcase-first em `docs/prottus/aplicacoes/`; defaults do cliente em `docs/projeto/padrao-aplicacoes.md`.

O agente e o time **devem** ler as especificações do projeto antes de gerar código ou apps.

---

## Estrutura documental padrão

```
projeto/
├── docs/
│   ├── prottus/                 # Mestres empresa (esta pasta)
│   │   └── aplicacoes/          # Catálogo Scriptcase-first
│   └── projeto/                 # Cliente
│       ├── documentacao-base/   # Entrada: descoberta prévia (Caminho A)
│       ├── especificacoes.md    # Stack, arquitetura, infra, Scriptcase
│       ├── padrao-aplicacoes.md # Tema e defaults das apps
│       ├── contexto.md
│       ├── design-system.md     # Marca
│       ├── mapa-entidades.md
│       ├── requisitos/
│       ├── modulos/             # Módulos de negócio
│       └── aplicacoes/          # Specs das apps
├── .cursor/
│   ├── rules/prottus/
│   ├── rules/projeto/
│   └── agents/
├── imagens/
└── …código / projeto Scriptcase conforme especificacoes.md
```

---

## Versionamento

- Conventional Commits recomendado
- Branches: `feature/`, `fix/`, `docs/`
- Não versionar temporários nem segredos
- `.gitignore` alinhado à stack do projeto

---

## Comunicação com IA (vibe coding)

- Registrar sessões em `.cursor/agents/cursor-{usuario}.md`
- Antes de UI: `docs/prottus/design-system.md` + `docs/projeto/design-system.md`
- Antes de criar app: `docs/prottus/aplicacoes/` + `docs/projeto/padrao-aplicacoes.md`
- Antes de código: `docs/projeto/especificacoes.md` + regras `.cursor/rules/projeto/`
- Playbook módulos: `.cursor/rules/prottus/desenvolvimento-modulos.mdc`
- Playbook apps: `.cursor/rules/prottus/desenvolvimento-aplicacoes.mdc`
- Nunca misturar requisitos de outro cliente
- Revisar código gerado antes de commitar

---

## Tratamento de erros e testes

- Tratar erros explicitamente; mensagens claras ao usuário
- Testar fluxos críticos de negócio
- Manter testes simples e focados; ferramentas conforme especificações do projeto

## Fases típicas

1. Fundação documental (mestres Prottus + pasta projeto + especificações)
2. Descoberta DOP/FAROL
3. Protótipo / MVP alinhado ao Design System
4. Backend / dados / integrações (conforme especificações)
5. Homologação com o cliente
