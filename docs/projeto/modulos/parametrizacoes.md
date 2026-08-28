# Módulo — Parametrizações

CRUD paginado padrão Prottus. Referência visual: abas horizontais do Semplice.
Hierarquia **real SAP** (import `base-sap`): Família → Subgrupo → Grupo.

## Abas — Produtos (ordem UI)

Do amplo para o específico, depois auxiliares:

| Ordem | Aba | Modelo | Observação |
|-------|-----|--------|------------|
| 1 | Famílias | `families` | ~17 (UC + AF); colunas tipo, subgrupos, itens, atributos |
| 2 | Subgrupos | `subgroups` | ~58; coluna pai (família) + grupos + itens |
| 3 | Grupos | `groups` | ~98; pai família/subgrupo + itens — `pageSize` até **500** |
| 4 | Hotéis | `hotels` | |
| 5 | Armazéns | `warehouses` | |
| 6 | Unidade Medida | `measure_units` | |

Volumes: árvore de **consumo** + árvore de **ativo fixo** (`item_kind`).

## API catálogo

- `GET /catalog/families|subgroups|groups?search=&item_kind=&page=&pageSize=`
- Busca no servidor (nome/código; subgrupo/grupo também no pai)
- `parseCatalogPage`: teto **500** (o `parsePage` geral continua em 100)
- Resposta inclui `productsCount`, pai, `itemKind`, `anomalies[]`

### Anomalias de importação (badges)

| Flag | Critério |
|------|----------|
| `quarantine` | nome `NAO CLASSIFICADO` |
| `ambiguous` | código família `TMP_*` (resolução de ambiguidade SAP) |
| `itens_placeholder` | grupo nome `ITENS` |

## Abas — Administrativo

| Aba | Modelo | Prints |
|-----|--------|--------|
| Usuários | `users` | `administrativo/print1`–`print9` — perfis/RBAC ainda **não** modelados |

## Padrão de tela

- Busca digitável (debounce) nas abas PDM → servidor
- Filtro **Tipo de item** (Consumo / Ativo fixo / Todos)
- Botão **Cadastrar** desabilitado até definição de política (árvore vem do SAP — criar no portal pode dessincronizar)
- Tabela: Nome (+ badges) · Código · Tipo · Pai · Contagens

## Hierarquia de códigos (SAP / portal)

```
Família (FAM… / AFF…)     ← nível mais amplo  (requests.family_id / ITM-11)
  └─ Subgrupo (SUB… / AFS…)
       └─ Grupo (GRP… / AFG…)  ← folha; products.group_id
```

Nomes podem colidir entre árvores; unicidade de família é `(name, item_kind)`.

## Rota

`/parametrizacoes/produtos` · `/parametrizacoes/administrativo`
