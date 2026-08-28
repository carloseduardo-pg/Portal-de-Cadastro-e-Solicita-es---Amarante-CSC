-- Reclassificação Aprovador ↔ Imobilizado (reunião 26/08).

ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "return_to_approver" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "classification_invalidated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "parent_request_id" UUID;

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_parent_request_id_fkey";
ALTER TABLE "requests" ADD CONSTRAINT "requests_parent_request_id_fkey"
  FOREIGN KEY ("parent_request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "requests_parent_request_id_idx" ON "requests"("parent_request_id");

ALTER TABLE "request_stages" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "request_stages" ADD COLUMN IF NOT EXISTS "outcome_detail" JSONB;

COMMENT ON COLUMN "requests"."return_to_approver" IS 'Após AF no Imobilizado: true = volta ao Aprovador CSC; false = Imobilizado encerra.';
COMMENT ON COLUMN "requests"."classification_invalidated" IS 'Classificação merceológica invalidada por reclassificação — exige árvore AF.';
COMMENT ON COLUMN "requests"."parent_request_id" IS 'Vínculo de divisão de lote misto (ainda não usado na operação).';
COMMENT ON COLUMN "request_stages"."outcome" IS 'Ex.: RECLASSIFY_FIXED_ASSET | RECLASSIFY_CONSUMPTION';
