# Exemplos de seed — Portal Amarante CSC

Seed principal: `backend/prisma/seed.ts` (via `database/scripts/seed.sh` ou `npx prisma db seed`).

**Política:** o seed popula **catálogo e parametrização**. Solicitações de produto **não** são geradas — entram pelo fluxo **Nova Solicitação**.

---

## Conteúdo

| Entidade | Quantidade (dev) |
|----------|------------------|
| Hotéis | 5 (MCZ, MGI, JPT, SALG, MV4) |
| Grupos / Subgrupos / Famílias | Catálogo PDM completo (`prisma/pdm-catalog.ts`) |
| Atributos por família | Protótipo PDM (chaves + exemplos) em todas as famílias — **não** é a base final Amarante |
| Produtos (base unificada) | Amostras realistas por família (busca/similares) |
| Centros de custo / UM | Por hotel + UN/LT/KG |
| Calendário útil | Dias úteis (SLA) |
| Fornecedor | 1 cadastro mestre de exemplo |
| Solicitações de produto | **0** (criar na UI) |
| Solicitações de fornecedor | **0** |

---

## Usuários locais

| E-mail | Senha | Papel |
|--------|-------|-------|
| `admin@amarante.local` | `amarante123` | **ADMIN** (vê todas as etapas da caixa) |
| `solicitante@amarante.local` | `amarante123` | SOLICITANTE |
| `erika@amarante.local` | `amarante123` | APROVADOR |
| `compliance@amarante.local` | `amarante123` | COMPLIANCE |

---

## Limpar solicitações de teste e reaplicar catálogo

```bash
# Apaga requests / stages / NCM mock e re-executa o seed (upserts de PDM/produtos)
cd backend && npx prisma db seed
```

Para zerar só o fluxo de solicitações sem reseed completo, use delete nas tabelas
`ncm_suggestions` → `request_stages` → `request_hotels` → `request_items` → `requests`.

---

## Reaplicar seed

```bash
bash database/scripts/seed.sh
# ou
cd backend && npx prisma db seed
```
