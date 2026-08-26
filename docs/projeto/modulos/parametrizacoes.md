# Módulo — Parametrizações

CRUD paginado padrão Prottus. Referência: abas horizontais do Semplice.

## Abas — Produtos

| Aba | Modelo | Print |
|-----|--------|-------|
| Hotéis | `hotels` | `print10-produtos-hoteis.png` |
| Armazéns | `warehouses` | `print11-produtos-armazens.png` |
| Famílias | `families` | `print12-produtos-familias.png` |
| Grupos | `groups` | `print13-produtos-grupos.png` |
| Sub Grupos | `subgroups` | `print14-produtos-subgrupos.png` |
| Unidade Medida | `measure_units` | `print15-produtos-unidades.png` |

## Abas — Administrativo

| Aba | Modelo | Prints |
|-----|--------|--------|
| Usuários | `users` | `administrativo/print1`–`print9` — perfis/RBAC ainda **não** modelados |

## Padrão de tela

- Filtro por nome + código
- Botões BUSCAR e CADASTRAR
- Tabela: Nome · Código · Inativado Em · Ações
- Paginação "Registros por página"
- Inativação lógica (não exclusão física)

## Melhorias vs Semplice

1. **Famílias:** colunas derivadas subgrupo e grupo do código
2. **Famílias:** coluna "Atributos" (contagem `product_attributes`)
3. Volumes reais seed: ~113 famílias, ~66 subgrupos

## Rota

`/parametrizacoes/produtos` · `/parametrizacoes/administrativo`

## Hierarquia de códigos

```
família(6) = subgrupo(3) + seq(3)
subgrupo(3) = grupo(1) + seq(2)
```

Exibir hierarquia derivada na listagem de famílias.
