# Design System — padrão Prottus

Documento **mestre de UI/UX da empresa**. Define padrões de interface reutilizáveis.

A **marca do cliente** (cores, logo, tokens hex) fica em `docs/projeto/design-system.md` e **deve** estender este padrão — nunca substituí-lo por convenções soltas.

**Tipos de aplicação (Scriptcase-first):** catálogo em [`docs/prottus/aplicacoes/`](aplicacoes/). Defaults de construção e tema Scriptcase do cliente: `docs/projeto/padrao-aplicacoes.md`. Em projetos Scriptcase, o tema da ferramenta deve espelhar os tokens abaixo (primária, header, tipografia, header de tabela, filter bar).

---

## 1. Princípios visuais Prottus

- Tokens via CSS `var(--...)` — nunca hardcode de cor em componentes novos
- Zero emojis na UI — apenas componente `Icon` (SVG outline)
- Títulos de módulo: **bold, UPPERCASE**
- Labels de formulário: tamanho pequeno, cor secundária
- Altura padrão de botões e inputs: **32px**
- Fidelidade à marca do cliente nos tokens `--brand-*`

---

## 2. Tokens obrigatórios (contrato)

Todo projeto Prottus deve definir (valores vêm do cliente):

| Token | Uso |
|-------|-----|
| `--brand-primary` / `-hover` / `-active` | Ações primárias, item ativo |
| `--brand-secondary` | Acentos secundários |
| `--header-bg` / `--header-text` | Topbar |
| `--sidebar-bg` / `--sidebar-active-bg` | Sidebar |
| `--page-bg` / `--card-bg` | Superfícies |
| `--filter-bar-bg` / `--table-header-bg` / `--tile-bg` | Listagens |
| `--text-primary` / `--secondary` / `--muted` | Tipografia |
| `--border-color` / `--info-banner` | Bordas e avisos |
| `--success` / `--warning` / `--danger` / `--info` / `--neutral` | Status |

Arquivo típico de tokens: conforme `docs/projeto/especificacoes.md` e `docs/projeto/design-system.md` (ex.: CSS variables no frontend web).

---

## 3. Tipografia padrão

| Token | Valor sugerido |
|-------|----------------|
| `--font-family` | Sans-serif moderna (definir no projeto) |
| `--font-size-body` | 14px |
| `--font-size-small` | 12px |
| `--font-size-title` | 16px |
| `--font-size-module` | 18px |

---

## 4. Componentes obrigatórios

### Botões (`.btn`)
- `btn-primary`, `btn-secondary`, `btn-outline`, `btn-ghost`
- Altura 32px; variantes via tokens de marca

### FilterBar (`.filter-bar`)
Label "Filtrar por:", campos e botão primário à direita.

### DataTable (`.data-table`)
Header com `--table-header-bg`; hover suave nas linhas.

### TileGrid (`.tile`)
Tiles para hubs de cadastro.

### Modal
Campos obrigatórios com `.form-field__required` (asterisco na cor de perigo/primária). Validar antes de salvar.

### Card (`.card`)
Fundo `--card-bg`, sombra leve, header com título/ação.

### StatusToggle
ATIVO/INATIVO nos modais de **criar e editar**.

### Icon
Componente de ícones vetoriais do projeto (outline, `currentColor`) — path conforme especificações. **Proibido:** emojis na UI de produto.

---

## 5. Layout shell padrão

```
┌ Header — logo cliente + ambiente + usuário ─────────┐
├────┬────────────────────────────────────────────────┤
│ SB │  TÍTULO MÓDULO (UPPERCASE)                     │
│    │  [FilterBar]                                   │
│    │  [Card / conteúdo]                             │
└────┴────────────────────────────────────────────────┘
```

- Login: sem sidebar; card central; logo do cliente
- Sidebar: ícones de módulo; ativo = fundo `--sidebar-active-bg`

---

## 6. Checklist — novo elemento visual

- [ ] Cores via `var(--...)` ou tema Scriptcase alinhado aos tokens do projeto
- [ ] Consultou `docs/prottus/design-system.md` **e** `docs/projeto/design-system.md`
- [ ] Consultou família/variante em `docs/prottus/aplicacoes/` + `docs/projeto/padrao-aplicacoes.md`
- [ ] Botões/inputs conforme densidade do projeto (referência 32px em UI web)
- [ ] `<Icon name="..." />` ou ícone vetorial — zero emojis
- [ ] Título de módulo UPPERCASE bold
- [ ] Campos obrigatórios com marcação de obrigatório
- [ ] Reutiliza FilterBar / DataTable / Card / Modal (ou equivalentes Scriptcase) quando aplicável

---

## 7. Manutenção

Mudanças de **padrão empresa** → este arquivo + regras em `.cursor/rules/prottus/`.  
Mudanças de **marca do cliente** → `docs/projeto/design-system.md` + assets/tokens do projeto.  
Stack/infra → `docs/projeto/especificacoes.md` (nunca neste documento).
