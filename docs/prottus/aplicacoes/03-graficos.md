# Gráficos — catálogo Prottus / Scriptcase

## 1. Quando usar

Visualização analítica de indicadores. Preferir gráfico ligado a consulta/resumo com os mesmos filtros. Não usar gráfico decorativo sem pergunta de negócio.

## 2. Variantes

### Tipos

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Barras / colunas | Comparar categorias | Eixo e série nomeados |
| Pizza / rosca | Composição (poucas fatias) | Evitar >6–8 categorias sem agrupamento |
| Linhas / área | Evolução temporal | Granularidade de data definida |
| Funil | Funil de conversão/etapas | Ordem das etapas |
| Radar | Comparação multidimensional | Mesma escala |
| Pirâmide | Hierarquia de volumes | Base/topo claros |
| Bolha / dispersão | Correlação / dois eixos | Unidades nos eixos |
| Empilhamento / combinação / multi-séries | Comparar séries | Legenda legível |
| Treemap / sunburst / heatmap | Hierarquia / intensidade | Tooltip com valor |
| Diagrama de cordas / Sankey | Fluxos entre nós | Origem → destino → valor |
| Gantt | Cronograma | Datas início/fim; fuso do projeto |

### Recursos

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Analítico / linha de tendência / zona de tendência | Análise | Método da tendência documentado |
| Scroll / zoomline | Séries longas | Controles visíveis |
| Overlapping | Sobreposição de séries | Contraste de cores (brand) |
| Link / link para outro gráfico | Navegação analítica | Parâmetros de drill |
| Barra de ferramentas do gráfico | Ações do usuário | Exports conforme projeto |
| Gráfico em campo da consulta | Sparkline / mini chart | Performance da grid |
| Linha (avaliação de produtos) | Série de ratings | Escala alinhada ao form |

### Exportações

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Enviar gráfico exportado por e-mail | Distribuição | API de e-mail do projeto |

## 3. Contrato Prottus

- Paleta de séries deriva das cores de marca (`--brand-primary`, secundária, status).
- Título UPPERCASE; sem emoji.
- Mesmos filtros conceituais da consulta/resumo de origem quando houver ligação.
- Acessível: não depender só de cor para distinguir séries (legenda + padrão quando possível).

## 4. Herança do projeto

- Tipo de gráfico **default**
- Paleta = brand do `design-system.md`
- Prefixo `graf_`
- Tema Scriptcase
- Locales/formatos numéricos e de data

## 5. DoD da aplicação

- [ ] Spec com pergunta de negócio, dimensões, medidas, filtros
- [ ] Ligação a consulta/dashboard/menu
- [ ] Paleta e tema do projeto
- [ ] Teste com dados vazios e com volume típico
- [ ] STATUS + agent atualizados
