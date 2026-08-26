# Documentação Prottus — mestres da empresa

Arquivos **padronizados da Prottus**, reutilizáveis em **qualquer** cliente/projeto.  
São **agnósticos de stack** — tecnologias ficam em `docs/projeto/especificacoes.md`.

Esta pasta é a fonte da verdade do “como a Prottus desenvolve”. Não substitua por conteúdo de um cliente.

## Documentos mestres

| Documento | Para quê |
|-----------|----------|
| [metodologia.md](metodologia.md) | Princípios, FAROL/DOP, métricas de qualidade, vibe coding |
| [design-system.md](design-system.md) | Padrões de UI/UX da empresa |
| [aplicacoes/](aplicacoes/) | Catálogo Scriptcase-first (formulários, consultas, gráficos, dashboards, menus, calendário, blank, a11y/i18n) |
| [mapa-entidades.md](mapa-entidades.md) | Como modelar e documentar o domínio |
| [CHECKLIST-NOVO-PROJETO.md](CHECKLIST-NOVO-PROJETO.md) | Lista curta de conferência do kickoff |

## Relação com o projeto

| Camada | Onde |
|--------|------|
| Mestres Prottus | `docs/prottus/` |
| Cliente (contexto, marca, domínio, **especificações**) | `docs/projeto/` |
| Regras Cursor Prottus | `.cursor/rules/prottus/` |
| Regras Cursor do projeto | `.cursor/rules/projeto/` |

Novo projeto: copie o conteúdo deste repositório padrão; preencha a camada `projeto`  
(preferência: Caminho A com [../projeto/documentacao-base/](../projeto/documentacao-base/README.md)).  
Guia: [COMO-INICIAR-UM-NOVO-PROJETO.md](../../COMO-INICIAR-UM-NOVO-PROJETO.md).
