# Relatórios / Consultas — catálogo Prottus / Scriptcase

## 1. Quando usar

Listagens, consultas operacionais, totais, quebras, pivots e exportações. Em gestão, a consulta costuma ser a porta de entrada do módulo, com link para formulário de edição.

## 2. Variantes

### Tipos

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Consulta com HTML definido pelo usuário | Layout customizado | HTML documentado; sem quebrar tema |
| Consulta horizontal | Linhas × colunas clássica | Colunas alinhadas ao cadastro; FilterBar/quicksearch conforme projeto |
| Consulta vertical | Um registro em bloco vertical | Campos legíveis; ação de editar |
| Consulta slide | Navegação tipo slide | Controles de navegação claros |

### Ferramentas

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Barra de ação com botões agrupados | Ações por linha/seleção | Ícone/texto conforme padrão do projeto |
| Barra de ferramentas fixa | Toolbar sempre visível | Não cobrir conteúdo crítico |
| Botão só ícone / só texto / ícone+texto | Densidade da action bar | Consistente em todas as grids do projeto |
| Grid com Font Awesome na action bar | Ícones na barra | Sem emoji; ícone com significado único |
| Salvar consulta e persistir estado | Preferências do usuário | Escopo (usuário/sessão) documentado |
| Agrupamento de botões | Organizar ações | Primárias vs. secundárias |
| Temas dinâmicos | Troca de tema em runtime | Só se o projeto permitir; default = tema do `padrao-aplicacoes.md` |

### Campos

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Códigos de barra / QR Code | Identificação visual | Dados fonte corretos |
| Agrupamento de campos | Colunas compostas | Labels claros |
| Porcentagem / acumulado | Indicadores numéricos | Formato e casas decimais do projeto |
| Imagem | Miniatura na grid | Tamanho e alt text |
| Avaliação | Rating na listagem | Mesma escala do formulário |

### Agrupamento de dados (quebras)

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Quebra com totalização e resumo | Totais por grupo | Funções (soma/contagem) explícitas |
| Quebra estática / estática múltipla | Grupos fixos | Ordem das quebras na spec |
| Quebra dinâmica (consulta / resumo) | Usuário escolhe quebra | Defaults seguros |

### Resumo

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Campo avaliação / colunas fixas / label fixo | Resumo legível | Alinhado à consulta origem |
| Paginação no resumo | Volumes grandes | Tamanho de página do projeto |
| Resumo e gráfico | Híbrido | Paleta = brand |
| Pivot Table (resumo matriz) | Cruzamento de dimensões | Dimensões/medidas na spec |
| Pivot + gráfico / filtro refinado | BI operacional | Filtros obrigatórios se volume alto |

### Filtragem

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Construtor de filtros avançado | Condições complexas | Operadores documentados |
| Períodos relativos | “Últimos 7 dias”, etc. | Timezone do projeto |
| Valor inicial pré-definido | Filtro já preenchido | Default no `padrao-aplicacoes.md` ou na spec |
| Condições personalizadas | SQL/regra extra | Sem secretos; revisão de segurança |
| Filtro do resumo com comparação de datas | Intervalos | Validar de ≤ até |
| Filtro refinado | Facetas laterais | Performance com volumes grandes |
| Campos obrigatórios no filtro | Impedir consulta aberta | Mensagem clara |
| Filtro e consulta na mesma página | UX única | Layout limpo |
| Filtro em modal | Economizar espaço | Abrir/aplicar/limpar explícitos |
| Quicksearch | Busca rápida | Campos indexados na spec |
| Blocos no filtro / botões em linha | Organização | Consistência visual |
| Combobox em cascata | Filtros dependentes | Ordem de carga |
| Etiqueta de filtro (consulta / resumo / gráfico) | Chips do filtro ativo | Remover etiqueta = limpar condição |

### Links e navegação

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Subconsulta | Detalhe aninhado | Parâmetros de ligação |
| Edição em modal | Abrir form sem sair da grid | Modal do catálogo de formulários |
| Subconsulta treeview | Hierarquia | Níveis na spec |
| Drill down | Ir a outro nível analítico | Destino e parâmetros |
| Mestre/detalhe em 3 níveis | Hierarquia profunda | Performance e breadcrumbs |
| Link para edição dos registros | Ir ao `frm_` | Nome da app destino |
| Scroll infinito / altura fixa / slide + infinito | Listas longas | Alternativa acessível à paginação |

### Exportações

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| PDF / Excel / JSON / XML | Saída de dados | Conjunto liberado no `padrao-aplicacoes.md` |
| Opções de exportação | Configurar saída | Defaults do projeto |
| Enviar export por e-mail (consulta/resumo) | Distribuição | API de e-mail do projeto; sem PII em log |
| XML de subconsulta | Integração | Schema acordado |

### Personalização

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Customização automática de campos | Formatação por regra | Regras na spec |
| Botão Run | Ação custom | Confirmação se destrutivo |

### PDF Report

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Cartão / nota fiscal em PDF | Documento formal | Marca do cliente; campos obrigatórios legais |

## 3. Contrato Prottus

- Título UPPERCASE; tema do projeto; zero emojis.
- Colunas da listagem devem existir no formulário de cadastro ligado.
- Filtros e exports seguem defaults do projeto (não liberar tudo “por hábito”).
- Totais e pivots com definições de negócio validadas (DOP/requisito).
- Tokens de header de tabela / filter bar alinhados ao DS.

## 4. Herança do projeto

- Orientação default (horizontal/vertical)
- Action bar (ícone/texto), quicksearch on/off
- Exports liberados
- Paginação / scroll
- Prefixo `grid_`
- Tema e densidade de grid

## 5. DoD da aplicação

- [ ] Spec em `docs/projeto/aplicacoes/` com variante, colunas, filtros, exports
- [ ] Link para formulário/dash/gráfico quando couber
- [ ] Tema e menu atualizados
- [ ] Teste: filtrar, ordenar, exportar, abrir edição
- [ ] STATUS + agent atualizados
