-- Ativo fixo: quantidade de unidades físicas + localização + campos AF1 opcionais no item da solicitação.

ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "unit_quantity" INTEGER;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "physical_location" TEXT;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "asset_tag" TEXT;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "acquisition_value" DECIMAL(14,2);
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "acquisition_date" DATE;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "useful_life_months" INTEGER;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "depreciation_rate" DECIMAL(8,4);
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "supplier_document" TEXT;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;

COMMENT ON COLUMN "request_items"."unit_quantity" IS 'AF: N unidades físicas a materializar na aprovação (1 produto por unidade).';
COMMENT ON COLUMN "request_items"."physical_location" IS 'AF: localização física textual.';
