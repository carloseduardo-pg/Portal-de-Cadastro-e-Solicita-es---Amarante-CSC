# Dashboards — catálogo Prottus / Scriptcase

## 1. Quando usar

Painel composto que reúne KPIs, gráficos, consultas e/ou resumos em uma visão executiva ou operacional. Usar quando a pergunta de negócio exige **vários widgets** na mesma tela; para um único gráfico, preferir app de Gráfico.

## 2. Variantes

### Exemplos de composição

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Dashboard de inventário | Estoque / posições | KPIs + grid ou gráfico; filtros de período/depósito |
| Dashboard de vendas (novos componentes UI) | Funil comercial | Mesmos filtros entre widgets |
| Mapas + KPIs + gráficos + resumos | Visão geo + indicadores | Fonte do mapa e permissões |
| Gráfico + form + resumo | Operação híbrida | Form não quebra o tema do dash |
| Lista de produtos + gráfico | Catálogo + tendência | Ligação de parâmetros produto → gráfico |
| Gráficos + consulta | Análise + detalhe tabular | Drill da série para a grid |

### Navegações

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Com parâmetros | Recebe contexto externo | Lista de parâmetros na spec |
| Ligação entre aplicações | Widgets abrem outras apps | App destino e parâmetros documentados |

## 3. Contrato Prottus

- Uma composição coerente: evitar “dashboard genérico” com widgets sem pergunta.
- Título UPPERCASE; tema e paleta do projeto; zero emojis.
- Filtros globais do dashboard (se houver) devem sincronizar widgets ligados.
- Densidade e tipografia herdadas do `padrao-aplicacoes.md`.
- Cada widget referencia a app/fonte de dados real (não mock legado).

## 4. Herança do projeto

- Layout default (quais famílias de widget são permitidas)
- Tema Scriptcase e brand
- Prefixo `dash_`
- App inicial do menu, se o dashboard for home
- Exports/e-mail só se liberados no padrão do projeto

## 5. DoD da aplicação

- [ ] Spec com mapa de widgets, fontes e parâmetros
- [ ] Tema aplicado; menu atualizado
- [ ] Teste de filtros cruzados e ligações
- [ ] STATUS + agent atualizados
