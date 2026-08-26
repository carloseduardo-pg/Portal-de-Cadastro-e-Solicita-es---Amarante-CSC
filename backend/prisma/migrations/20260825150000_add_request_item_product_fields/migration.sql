-- Campos complementares do item na solicitação (espelho Semplice / products).
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "purchase_qty_total" DECIMAL(14, 3);
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "unified_code" TEXT;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "legacy_code" TEXT;
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "law_116" TEXT;
