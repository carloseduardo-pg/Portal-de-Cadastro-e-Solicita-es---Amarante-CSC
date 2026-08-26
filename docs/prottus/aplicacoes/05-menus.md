# Menus — catálogo Prottus / Scriptcase

## 1. Quando usar

Navegação do sistema: estrutura de módulos, app inicial pós-login, abas e breadcrumbs. Todo projeto Scriptcase Prottus deve ter **pelo menos um** menu (ou app de aba) definido no `padrao-aplicacoes.md`.

## 2. Variantes

### Tipos

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Horizontal | Itens no topo | Logo/header alinhados ao DS; item ativo visível |
| Menu horizontal dividido | Grupos no topo | Agrupamento por módulo de negócio |
| Vertical | Sidebar clássica | Ícones de módulo; ativo = cor `--sidebar-active-bg` / tema |
| Vertical com barra de ferramentas | Sidebar + toolbar | Toolbar só com ações globais |

### Navegações

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Abas | Conteúdo em tabs | Título de aba claro; sem sobrecarregar |
| Breadcrumb | Caminho hierárquico | Consistente com mestre/detalhe e drill |

### Outros

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Menu dinâmico | Itens por perfil/permissão | Fonte de itens e regra de segurança |
| Combinação de menus | Mais de um padrão | Documentar qual menu é o root |

### Aplicação de aba

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Com dashboards | Shell com dash | App inicial definida |
| Com formulário e consulta | Cadastro no shell | Prefixo e nomes das apps filhas |
| Com consulta, gráfico e resumo | Analítico no shell | Mesmos filtros entre abas quando fizer sentido |

## 3. Contrato Prottus

- Itens de menu em português de negócio; nomes técnicos das apps seguem prefixos do projeto.
- Zero emojis; ícones vetoriais / Font Awesome conforme padrão do projeto.
- Item ativo e header respeitam tokens de marca.
- Estrutura do menu espelha `docs/projeto/modulos/` (áreas de negócio).
- App de segurança/login não fica “escondida” sem documentação.

## 4. Herança do projeto

- Orientação default (vertical/horizontal)
- App inicial pós-login
- Tema e logo
- Prefixo `menu_`
- Perfis que veem cada item (se houver)

## 5. DoD da aplicação

- [ ] Spec com árvore de itens → apps destino
- [ ] Tema, logo e item ativo conferidos
- [ ] Todas as apps entregues do módulo aparecem (ou justificativa de ocultação)
- [ ] STATUS + agent atualizados
