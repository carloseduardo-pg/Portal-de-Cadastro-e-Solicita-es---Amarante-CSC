-- ItemKind: consumo vs ativo fixo (árvores e regras distintas).
-- Família passa a ser única por (name, item_kind) — nomes colidem entre abas SAP.

CREATE TYPE "ItemKind" AS ENUM ('CONSUMPTION', 'FIXED_ASSET');

ALTER TABLE "families" ADD COLUMN "item_kind" "ItemKind" NOT NULL DEFAULT 'CONSUMPTION';
DROP INDEX IF EXISTS "families_name_key";
CREATE UNIQUE INDEX "families_name_item_kind_key" ON "families"("name", "item_kind");

ALTER TABLE "products" ADD COLUMN "item_kind" "ItemKind" NOT NULL DEFAULT 'CONSUMPTION';
ALTER TABLE "request_items" ADD COLUMN "item_kind" "ItemKind" NOT NULL DEFAULT 'CONSUMPTION';

-- Backfill a partir do flag legado / prefixo SAP
UPDATE "products"
SET "item_kind" = 'FIXED_ASSET', "fixed_asset" = true
WHERE "fixed_asset" = true OR "sap_code" LIKE 'AT%';

UPDATE "products"
SET "item_kind" = 'CONSUMPTION', "fixed_asset" = false
WHERE "item_kind" = 'CONSUMPTION' AND ("sap_code" IS NULL OR "sap_code" LIKE 'UC%');

-- Famílias usadas só por produtos AF → marcar FIXED_ASSET
UPDATE "families" f
SET "item_kind" = 'FIXED_ASSET'
WHERE EXISTS (
  SELECT 1
  FROM products p
  JOIN groups g ON g.id = p.group_id
  JOIN subgroups sg ON sg.id = g.subgroup_id
  WHERE sg.family_id = f.id AND p.item_kind = 'FIXED_ASSET'
)
AND NOT EXISTS (
  SELECT 1
  FROM products p
  JOIN groups g ON g.id = p.group_id
  JOIN subgroups sg ON sg.id = g.subgroup_id
  WHERE sg.family_id = f.id AND p.item_kind = 'CONSUMPTION'
);

UPDATE "request_items" ri
SET "item_kind" = 'FIXED_ASSET'
FROM "requests" r
WHERE ri.request_id = r.id AND r.fixed_asset = true;

-- CONSUMPTION sem UM (ex.: "Manual" na planilha) → UN para satisfazer a regra de kind
UPDATE "products" p
SET "measure_unit_id" = mu.id
FROM "measure_units" mu
WHERE mu.code = 'UN'
  AND p.item_kind = 'CONSUMPTION'
  AND p.measure_unit_id IS NULL;

-- Campos patrimoniais (AF5) — nullable, sem default inventado
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "asset_tag" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "acquisition_value" DECIMAL(14,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "acquisition_date" DATE;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cost_center_id" UUID;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hotel_id" UUID;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "physical_location" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "useful_life_months" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "depreciation_rate" DECIMAL(8,4);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplier_document" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_cost_center_id_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_cost_center_id_fkey"
  FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_hotel_id_fkey";
ALTER TABLE "products" ADD CONSTRAINT "products_hotel_id_fkey"
  FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "products_item_kind_idx" ON "products"("item_kind");

-- CONSUMPTION exige unidade de medida; FIXED_ASSET pode (deve) ficar sem UM
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_consumption_requires_measure_unit";
ALTER TABLE "products" ADD CONSTRAINT "products_consumption_requires_measure_unit"
  CHECK ("item_kind" <> 'CONSUMPTION'::"ItemKind" OR "measure_unit_id" IS NOT NULL);
