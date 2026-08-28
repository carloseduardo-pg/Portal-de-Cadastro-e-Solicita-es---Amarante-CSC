# Base de itens SAP B1 — entendimento completo

**Amarante [CSC] × Prottus** · Arquivo: `base-sap/itens/Base de itens SAP B1.xlsx`
Análise em 28/08/2026 · 3.911 itens em duas abas

---

## 1. O que a base é

Duas abas, dois universos diferentes:

| Aba | Itens | Colunas | O que é |
|-----|-------|---------|---------|
| **Uso e consumo** | 3.598 | 11 | Itens de estoque. Um registro por **tipo** de produto. |
| **Ativo Fixo** | 313 | 8 | Bens patrimoniais. Um registro por **unidade física**. |

As três colunas que a aba Ativo Fixo **não tem** dizem tudo: `Item de estoque`, `Unidade de medida` e `Lote`. Ativo fixo não tem unidade de medida porque não se compra "3 KG de cadeira" — se compra a cadeira. Não tem lote porque não tem validade nem rastreio sanitário. Não é item de estoque porque não entra no giro.

---

## 2. A hierarquia está invertida em relação ao que o protótipo assume

**Confirmado nos dados.** A ordem correta é:

```
FAMÍLIA  (17)   ← o mais amplo
   └── SUBGRUPO  (58)
          └── GRUPO  (98)   ← o mais específico
```

Exemplo real, item `UC000001`:

| Campo | Valor |
|-------|-------|
| Família | ALIMENTOS |
| Subgrupo | ACUCARES ADOCANTES DOCES |
| Grupo de itens | ACUCARES, ADOCANTES |
| Descrição | ACUCAR CONFEITEIRO |

O protótipo hoje assume o contrário — `Grupo(1 dígito) → SubGrupo(3) → Família(6)`, derivado dos códigos do Semplice. **Está errado e precisa ser invertido.**

### 2.1 Não existem códigos

No Semplice, a hierarquia era derivável do código: família `101002` continha o subgrupo `101` que continha o grupo `1`. **No SAP B1 isso não existe.** Família, subgrupo e grupo são apenas **texto livre**, sem código.

Consequência direta: toda a lógica de `pdmCascade` e de derivação por prefixo do protótipo perde a base. A hierarquia passa a ser mantida por chave estrangeira, não por convenção de string.

Recomendação: gerar códigos internos na importação (`FAM01`, `SUB0101`, `GRP010101`) para dar estabilidade a URLs, filtros e integrações — mas guardar o nome do SAP como chave de reconciliação.

---

## 3. A árvore de Uso e Consumo

17 famílias, ordenadas por volume:

| # | Família | Itens | Subgrupos |
|---|---------|-------|-----------|
| 1 | MANUTENCAO E OBRAS | 1.142 | 18 |
| 2 | ALIMENTOS | 791 | 13 |
| 3 | ESPORTE E LAZER | 356 | 3 |
| 4 | UTENS. COZINHA/ELETROPORTATEIS | 261 | 1 |
| 5 | UNIFORMES | 173 | 3 |
| 6 | HOSPEDAGEM | 144 | 3 |
| 7 | MATERIAL DE ESCRITORIO | 143 | 1 |
| 8 | EQUIPAMENTOS DE SEGURANCA | 130 | 2 |
| 9 | MATERIAL DE LIMPEZA | 130 | 2 |
| 10 | BEBIDAS | 90 | 2 |
| 11 | MATERIAL DESCARTAVEL | 77 | 1 |
| 12 | **IMOBILIZADO** | **61** | 3 |
| 13 | MATERIAL GRAFICO PERSONALIZADO | 38 | 1 |
| 14 | COMBUSTIVEL E LUBRIFICANTE | 28 | 1 |
| 15 | JARDINAGEM | 20 | 1 |
| 16 | SUPRIMENTOS MEDICOS | 12 | 2 |
| 17 | MATERIAL ADESIVO E VEDACAO | 2 | 1 |

Duas famílias merecem atenção imediata:

**IMOBILIZADO (61 itens)** — é ativo fixo cadastrado na aba errada. Seus três subgrupos (EQUIP INFORMATICA E TELEFONIA, MAQUINAS E EQUIPAMENTOS, MOVEIS E UTENSILIOS) são exatamente as famílias da aba Ativo Fixo. E 61 de 61 estão marcados como `Item de estoque = Sim`, o que é contábil e operacionalmente errado para um bem patrimonial.

**MATERIAL ADESIVO E VEDACAO (2 itens)** — é uma inversão. Esta "família" é, em toda a resto da base, um **subgrupo** de MANUTENCAO E OBRAS. E o subgrupo desses 2 itens é "MANUTENCAO E OBRAS", que é uma família. Os dois níveis foram trocados no cadastro.

### 3.1 A sobreposição entre as abas

**28 descrições aparecem nas duas abas.** Os mesmos notebooks, impressoras, câmeras e access points estão cadastrados como item de consumo *e* como ativo fixo:

```
NOTEBOOK LOQ E I5 16GB RAM CZ LENOVO
MACBOOK AIR M2 16GB 13,6POL 256GB MNOITE
IMPRESSORA ECO TANK L5590 EPSON
CAMERA SEG IA 8MP VIP 3830 INTELBRAS
ACCESS POINT 2,4/5GHZ 5 ANT 574MPBS
...
```

Este é o argumento factual para o botão "Ativo Fixo" na etapa do aprovador: **o erro de classificação já acontece hoje, 61 vezes, e ninguém tem onde corrigi-lo.**

---

## 4. A árvore de Ativo Fixo é degenerada

4 famílias, 4 subgrupos, 5 grupos — e nos três maiores ramos os três níveis têm **o mesmo nome**:

| Família | Subgrupo | Grupo | Itens |
|---------|----------|-------|-------|
| MAQUINAS E EQUIPAMENTOS | MAQUINAS E EQUIPAMENTOS | MAQUINAS E EQUIPAMENTOS | 136 |
| MOVEIS E UTENSILIOS | MOVEIS E UTENSILIOS | MOVEIS E UTENSILIOS | 95 |
| EQUIP INFORMATICA E TELEFONIA | EQUIP INFORMATICA E TELEFONIA | EQUIP INFORMATICA E TELEFONIA | 54 |
| IMOBILIZADO | VEICULOS | VEICULOS | 2 |

Mais um grupo órfão, `EQUIPAMENTOS DE INFORMATICA` (3 itens), que é sinônimo de `EQUIP INFORMATICA E TELEFONIA` com outro nome.

**Leitura:** a classificação de ativo fixo não é merceológica, é **contábil**. As quatro "famílias" são, na prática, contas do imobilizado — Máquinas e Equipamentos, Móveis e Utensílios, Equipamentos de Informática, Veículos. São exatamente as contas padrão do balanço.

Isso tem consequência de produto: **o ativo fixo não precisa de PDM.** Ele precisa de conta contábil, número de patrimônio, centro de custo e localização física. Forçá-lo na mesma árvore de três níveis dos itens de consumo é forçar uma estrutura que a contabilidade não usa.

---

## 5. Ativo fixo é instância, não tipo — a descoberta que muda o fluxo

Na aba Ativo Fixo, 13 descrições se repetem, envolvendo 70 dos 313 itens:

| Repetições | Descrição |
|---|---|
| 15× | CADEIRA BODY PPP CNZ 560X800X445MM |
| 11× | CAMERA SEG INTELBRAS VIP 1230B |
| 9× | CAMERA SEG INTELBRAS VIP 3230 |
| 7× | LIXEIRA AI 430 11L |
| 6× | GELAGUA DE COLUNA COM GARRAFAO INFERIOR |

**Isso não é sujeira de base. É a natureza do ativo fixo.** Quinze cadeiras idênticas são quinze bens patrimoniais distintos, cada um com seu número de patrimônio, sua depreciação e sua localização. O SAP registra um por unidade porque a contabilidade exige.

Item de consumo é **tipo**: um registro, N unidades em estoque.
Ativo fixo é **instância**: N registros, um por unidade física.

### Consequência crítica para o protótipo

A trava anti-duplicidade de 100% que foi implementada em 27/08 **não pode valer para ativo fixo**. Se valesse, seria impossível cadastrar a segunda cadeira. O fluxo de ativo fixo precisa do comportamento inverso: **oferecer "cadastrar mais uma unidade deste bem"** a partir de um registro existente.

---

## 6. Anomalias que a importação precisa tratar

| # | Anomalia | Volume | Tratamento |
|---|----------|--------|------------|
| A1 | **NCM corrompido pelo Excel** — virou data (`3209-10-10 00:00:00` em vez de `3209.10.10`) | 80 itens (75 UC + 5 AF) | Reconstruível 100%: `AAAA-MM-DD` → `AAAA.MM.DD`. Lista completa em `sap-ncm-corrompidos.json` |
| A2 | **Hierarquia ambígua** — subgrupo em 2 famílias, grupo em 2 subgrupos | 6 subgrupos + 10 grupos | Quase todos são outliers de 1 a 4 itens contra um ramo dominante de 15 a 263. Resolver pelo ramo dominante e **listar as exceções para a Amarante** |
| A3 | **Itens sem subgrupo ou família** | 2 UC + 26 AF | Os 26 de ativo fixo têm grupo mas não têm os níveis acima. Importar em quarentena |
| A4 | **Descrições duplicadas ativas** em Uso e Consumo | 41 descrições, 83 itens | São duplicatas reais — o gargalo 1 do projeto, visível na base oficial |
| A5 | **Código Legado duplicado** | 46 UC + 14 AF | Não pode ser chave única |
| A6 | **NCM ausente** | 209 UC + 16 AF | 5,8% da base sem classificação fiscal |
| A7 | **Código Legado ausente** | 256 UC + 29 AF | Itens novos, sem correspondência no sistema antigo |
| A8 | **UM = "Manual"** | 57 itens | Não é unidade de medida — é marcador de item sem UM definida |
| A9 | **Grupo chamado "Itens"** | — | Placeholder dentro de PECAS DE REPOSICAO |
| A10 | **Famílias e subgrupos trocados** | MATERIAL ADESIVO E VEDACAO, 2 itens | Corrigir na importação e reportar |

### Sobre a normalização de descrição

Testei: normalizar as descrições (remover acento, caixa alta, colapsar espaço e pontuação) **não gera nenhuma colisão nova** — 3.480 descrições distintas antes e depois, nas duas abas.

Isso é uma boa notícia para o `pdm_signature` proposto na Onda 2: a trava por descrição normalizada pode ser aplicada à base real **sem quebrar nada**, e as 41 duplicatas ativas que ela vai pegar são duplicatas de verdade.

---

## 7. Campos e domínios

### Uso e consumo

| Coluna | Domínio observado | Nota |
|--------|-------------------|------|
| `Nº do item` | `UC` + 6 dígitos, 3.598 únicos, 18 buracos na sequência | Chave primária no SAP |
| `Descrição do item` | Livre, CAIXA ALTA | 3.539 distintas de 3.598 |
| `Item de estoque` | Sim (3.560) / Não (38) | |
| `Código Legado` | Numérico com `.0` — veio como float do Excel | Precisa virar texto sem decimal |
| `Código NCM` | `9999.99.99` | 209 vazios, 75 corrompidos |
| `Grupo de itens` | 98 valores | Nível mais específico |
| `Subgrupo` | 58 valores | |
| `Família` | 17 valores | Nível mais amplo |
| `Ativo` | Sim (3.522) / Não (76) | |
| `Unidade de medida` | UN 3.079 · KG 425 · Manual 57 · MT 24 · M3 7 · LT 6 | Só 5 UMs reais |
| `Lote` | Não (2.684) / Sim (914) | Sempre `Não` quando não é item de estoque |

### Ativo Fixo

Mesmas colunas menos `Item de estoque`, `Unidade de medida` e `Lote`. `Ativo` é `Sim` em 100% — nenhum bem baixado na base.

---

## 8. O que isso muda no protótipo

| # | O que está no protótipo hoje | O que a base real exige |
|---|------------------------------|--------------------------|
| M1 | Hierarquia `Grupo → Subgrupo → Família` | **Inverter**: `Família → Subgrupo → Grupo` |
| M2 | Códigos numéricos com prefixo derivável (`101002`) | Não existem. Hierarquia por FK, código interno gerado |
| M3 | 6 grupos, 19 subgrupos, 38 famílias no seed | 17 famílias, 58 subgrupos, 98 grupos reais |
| M4 | `products.fixed_asset` como boolean nunca usado | Ativo fixo é **outro tipo de item**, com campos e fluxo próprios |
| M5 | Trava anti-duplicidade de 100% para tudo | **Não vale para ativo fixo** — instância, não tipo |
| M6 | 3 unidades de medida no seed (UN, LT, KG) | 5 reais + o marcador "Manual" |
| M7 | `ncm_code` string livre | 1.044 NCMs distintos, 80 corrompidos, formato `9999.99.99` |
| M8 | Uma única cadeia de aprovação | Ativo fixo passa pelo Imobilizado antes do CSC |

---

## 9. Perguntas para a Amarante

Estas saem direto da base e não dá para responder do lado da Prottus:

1. **Os 61 itens da família IMOBILIZADO em Uso e Consumo devem migrar para Ativo Fixo?** São 61 bens marcados como item de estoque.
2. **As 41 descrições duplicadas ativas devem ser mescladas?** Se sim, qual registro sobrevive — o de menor `Nº do item` ou o de maior?
3. **O que significa `Unidade de medida = "Manual"`?** São 57 itens.
4. **Os 26 ativos fixos sem subgrupo e família devem receber qual classificação?**
5. **`MATERIAL ADESIVO E VEDACAO` como família (2 itens) é erro de cadastro?** Em todo o resto da base ela é subgrupo de MANUTENCAO E OBRAS.
6. **`EQUIPAMENTOS DE INFORMATICA` e `EQUIP INFORMATICA E TELEFONIA` são o mesmo grupo?**
7. **Ativo fixo tem número de patrimônio?** Não está nesta planilha, e é o campo que identifica cada unidade física.
8. **Qual a conta contábil de cada família de ativo fixo?** As quatro famílias parecem ser contas do imobilizado.
