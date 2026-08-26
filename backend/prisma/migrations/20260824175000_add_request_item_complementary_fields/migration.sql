-- AlterTable: complementary fields on request_items (centro de custo, UM, origem, valor)
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "cost_center_id" UUID,
ADD COLUMN IF NOT EXISTS "item_value" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "measure_unit_id" UUID,
ADD COLUMN IF NOT EXISTS "source" "ProductSource" NOT NULL DEFAULT 'NATIONAL';

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_items_measure_unit_id_fkey'
  ) THEN
    ALTER TABLE "request_items" ADD CONSTRAINT "request_items_measure_unit_id_fkey"
      FOREIGN KEY ("measure_unit_id") REFERENCES "measure_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_items_cost_center_id_fkey'
  ) THEN
    ALTER TABLE "request_items" ADD CONSTRAINT "request_items_cost_center_id_fkey"
      FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
