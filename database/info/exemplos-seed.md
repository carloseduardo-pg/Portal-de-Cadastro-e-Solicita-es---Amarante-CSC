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

## Usuários

Senha seed (protótipo): `amarante123`.

| E-mail | Papel |
|--------|-------|
| `amanda.cavalcante@amarantehoteis.com.br` | **ADMIN** |
| `beatriz.barros@amarantehoteis.com.br` | SOLICITANTE |
| `andresa.ferreira@amarantehoteis.com.br` | APROVADOR (Administrativo) |
| `erika.fouchard@amarantehoteis.com.br` | APROVADOR_IMOBILIZADO |
| `admin@amarante.local` | ADMIN (lab — único `*.local`) |

Usuários demo **não** são criados quando `NODE_ENV=production`. `npm run migrate` não semeia sozinho — use `npm run setup` ou `npm run seed` no ambiente local.

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
