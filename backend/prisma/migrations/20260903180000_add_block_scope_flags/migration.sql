-- Bloqueio unificado: um único RequestType com flags de escopo.
-- Parcial x total deixa de ser tipo de solicitação e passa a ser derivado
-- de block_requisition / block_purchase (colunas também exportáveis ao CRM).

ALTER TYPE "RequestType" ADD VALUE IF NOT EXISTS 'BLOQUEIO';

ALTER TABLE "requests"
  ADD COLUMN "block_requisition" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "block_purchase" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "products"
  ADD COLUMN "block_requisition" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "block_purchase" BOOLEAN NOT NULL DEFAULT false;

-- Histórico: bloqueio total cobria os dois canais; parcial não registrava o canal,
-- então marca requisição para não perder a informação de que havia bloqueio.
UPDATE "requests"
SET "block_requisition" = true, "block_purchase" = true
WHERE "type" = 'BLOQUEIO_TOTAL';

UPDATE "requests"
SET "block_requisition" = true
WHERE "type" = 'BLOQUEIO_PARCIAL';

UPDATE "products"
SET "block_requisition" = true, "block_purchase" = true
WHERE "block_state" = 'TOTAL';

UPDATE "products"
SET "block_requisition" = true
WHERE "block_state" = 'PARTIAL';
