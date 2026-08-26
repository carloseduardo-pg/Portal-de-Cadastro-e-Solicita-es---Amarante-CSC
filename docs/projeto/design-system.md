# Design System — Amarante [CSC]

Marca visual do Portal de Cadastro & Solicitação Amarante.

## Logos

| Arquivo | Uso |
|---------|-----|
| `frontend/public/marca/logo_vazado_simples.png` | Favicon, sidebar recolhida |
| `frontend/public/marca/logo_vazado_completo.png` | Sidebar expandida, login |
| `frontend/public/marca/logo_simples.png` | Referência legada |
| `frontend/public/marca/logo_prottus.png` | Rodapé — "Desenvolvido por" |

## Paleta (tokens em `amarante-tokens.css`)

| Token | Valor | Uso |
|-------|-------|-----|
| `--brand-primary` | `#094111` | Ação primária, topbar, cabeçalho tabela |
| `--brand-secondary` | `#7E975B` | Focus, bordas secundárias |
| `--brand-accent` | `#F8AB2B` | Barra item ativo, badges SLA, alertas |
| `--sidebar-bg` | `#FFFFFF` | Sidebar branca |
| `--sidebar-active-bg` | `#EDF2E7` | Item ativo |
| `--sidebar-active-bar` | `#F8AB2B` | Barra lateral item ativo |
| `--page-bg` | `#F5F7F3` | Fundo da página |

## Decisões de design

1. **Sidebar branca** — o Semplice usa verde-oliva; o logo verde some no fundo verde. Sidebar branca com item ativo em verde-claro e barra amarela.
2. **Topbar verde escuro** — hierarquia: verde = navegação/ação; amarelo = destaque/alerta (não botão primário).
3. **Prottus no rodapé** — mesmo lugar do "Produto licenciado por Manyminds" do Semplice.
4. **Zero emojis** — usar `Icon.tsx`.
5. **Títulos de módulo** — UPPERCASE bold (`.module-title`).
6. **Amarelo é acento** — botões primários são verde; amarelo para SLA e destaque sidebar.

## Tipografia

Source Sans 3 (Google Fonts) — `--font-family`.

## Referência Semplice

Prints em `imagens/Imagens Semplice/` — layout e fluxo, **não** qualidade visual.
