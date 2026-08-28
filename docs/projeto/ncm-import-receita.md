# Import NCM / TIPI (Receita Federal)

A tabela `ncm_codes` é bootstrapada com os NCMs **em uso** na base SAP (`source=SAP_USAGE`),
com descrição provisória `9999.99.99`, para o portal funcionar **antes** da TIPI oficial.

## Quando a Amarante entregar a tabela Receita

1. Obter CSV TIPI (código + descrição). Separador `;` ou `,`.
2. Rodar:

```bash
npm run import:ncm-receita --prefix backend -- /caminho/tipi.csv
```

3. O script faz upsert em `ncm_codes`:
   - `code` = 8 dígitos (pontuação removida)
   - `description` = texto da Receita
   - `source` = `RECEITA`

NCMs só do bootstrap SAP permanecem até serem cobertos pela TIPI; FKs em
`products.ncm_code` / `request_items.ncm_code` não quebram.

## Formato canônico

| Camada | Formato |
|--------|--------|
| Banco / API | `22021000` (CHAR(8)) |
| UI | `2202.10.00` |

Helpers: `backend/src/common/ncm.ts` · `frontend/src/lib/ncm.ts`
