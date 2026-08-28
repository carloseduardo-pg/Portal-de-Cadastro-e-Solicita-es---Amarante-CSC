-- ncm_codes + FK em products / request_items.
-- Formato canônico: 8 dígitos (CHAR(8)), sem pontuação.
-- Bootstrap: NCMs distintos já usados na base (portal funciona antes da TIPI Receita).

CREATE TABLE IF NOT EXISTS "ncm_codes" (
  "code" CHAR(8) PRIMARY KEY,
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'SAP_USAGE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Normalizar ncm_code existente → 8 dígitos ou NULL
-- ---------------------------------------------------------------------------
UPDATE "products"
SET "ncm_code" = NULL
WHERE "ncm_code" IS NOT NULL
  AND length(regexp_replace("ncm_code", '[^0-9]', '', 'g')) < 8;

UPDATE "products"
SET "ncm_code" = left(regexp_replace("ncm_code", '[^0-9]', '', 'g'), 8)
WHERE "ncm_code" IS NOT NULL
  AND length(regexp_replace("ncm_code", '[^0-9]', '', 'g')) >= 8;

UPDATE "request_items"
SET "ncm_code" = NULL
WHERE "ncm_code" IS NOT NULL
  AND length(regexp_replace("ncm_code", '[^0-9]', '', 'g')) < 8;

UPDATE "request_items"
SET "ncm_code" = left(regexp_replace("ncm_code", '[^0-9]', '', 'g'), 8)
WHERE "ncm_code" IS NOT NULL
  AND length(regexp_replace("ncm_code", '[^0-9]', '', 'g')) >= 8;

UPDATE "ncm_suggestions"
SET "ncm" = left(regexp_replace("ncm", '[^0-9]', '', 'g'), 8)
WHERE length(regexp_replace(coalesce("ncm", ''), '[^0-9]', '', 'g')) >= 8;

-- ---------------------------------------------------------------------------
-- Popular ncm_codes com NCMs em uso (produtos + itens de solicitação)
-- Descrição provisória até import TIPI Receita.
-- ---------------------------------------------------------------------------
INSERT INTO "ncm_codes" ("code", "description", "active", "source", "created_at", "updated_at")
SELECT DISTINCT
  left(regexp_replace(p."ncm_code", '[^0-9]', '', 'g'), 8),
  substring(left(regexp_replace(p."ncm_code", '[^0-9]', '', 'g'), 8) from 1 for 4)
    || '.' || substring(left(regexp_replace(p."ncm_code", '[^0-9]', '', 'g'), 8) from 5 for 2)
    || '.' || substring(left(regexp_replace(p."ncm_code", '[^0-9]', '', 'g'), 8) from 7 for 2),
  true,
  'SAP_USAGE',
  NOW(),
  NOW()
FROM "products" p
WHERE p."ncm_code" IS NOT NULL
  AND length(regexp_replace(p."ncm_code", '[^0-9]', '', 'g')) = 8
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ncm_codes" ("code", "description", "active", "source", "created_at", "updated_at")
SELECT DISTINCT
  left(regexp_replace(ri."ncm_code", '[^0-9]', '', 'g'), 8),
  substring(left(regexp_replace(ri."ncm_code", '[^0-9]', '', 'g'), 8) from 1 for 4)
    || '.' || substring(left(regexp_replace(ri."ncm_code", '[^0-9]', '', 'g'), 8) from 5 for 2)
    || '.' || substring(left(regexp_replace(ri."ncm_code", '[^0-9]', '', 'g'), 8) from 7 for 2),
  true,
  'SAP_USAGE',
  NOW(),
  NOW()
FROM "request_items" ri
WHERE ri."ncm_code" IS NOT NULL
  AND length(regexp_replace(ri."ncm_code", '[^0-9]', '', 'g')) = 8
ON CONFLICT ("code") DO NOTHING;

-- Ajustar tipo das colunas para CHAR(8)
ALTER TABLE "products" ALTER COLUMN "ncm_code" TYPE CHAR(8)
  USING CASE
    WHEN "ncm_code" IS NULL THEN NULL
    ELSE left(regexp_replace("ncm_code", '[^0-9]', '', 'g'), 8)::char(8)
  END;

ALTER TABLE "request_items" ALTER COLUMN "ncm_code" TYPE CHAR(8)
  USING CASE
    WHEN "ncm_code" IS NULL THEN NULL
    ELSE left(regexp_replace("ncm_code", '[^0-9]', '', 'g'), 8)::char(8)
  END;

-- FKs
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_ncm_code_fkey";
ALTER TABLE "products"
  ADD CONSTRAINT "products_ncm_code_fkey"
  FOREIGN KEY ("ncm_code") REFERENCES "ncm_codes"("code")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "request_items" DROP CONSTRAINT IF EXISTS "request_items_ncm_code_fkey";
ALTER TABLE "request_items"
  ADD CONSTRAINT "request_items_ncm_code_fkey"
  FOREIGN KEY ("ncm_code") REFERENCES "ncm_codes"("code")
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "products_ncm_code_idx" ON "products"("ncm_code");
CREATE INDEX IF NOT EXISTS "request_items_ncm_code_idx" ON "request_items"("ncm_code");

-- Relatório: itens ativos sem NCM (passivo fiscal) — tabela auxiliar para a Amarante
CREATE TABLE IF NOT EXISTS "_ncm_missing_active_products" (
  "reported_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "family_name" TEXT NOT NULL,
  "item_kind" TEXT NOT NULL,
  "sap_code" TEXT,
  "unified_code" TEXT,
  "description_short" TEXT NOT NULL,
  "product_id" UUID NOT NULL
);

DELETE FROM "_ncm_missing_active_products";

INSERT INTO "_ncm_missing_active_products" (
  "family_name", "item_kind", "sap_code", "unified_code", "description_short", "product_id"
)
SELECT
  f."name",
  p."item_kind"::text,
  p."sap_code",
  p."unified_code",
  p."description_short",
  p."id"
FROM "products" p
JOIN "groups" g ON g."id" = p."group_id"
JOIN "subgroups" sg ON sg."id" = g."subgroup_id"
JOIN "families" f ON f."id" = sg."family_id"
WHERE p."active" = true
  AND p."ncm_code" IS NULL;

DO $$
DECLARE
  n INT;
  nc INT;
BEGIN
  SELECT COUNT(*) INTO n FROM "_ncm_missing_active_products";
  SELECT COUNT(*) INTO nc FROM "ncm_codes";
  RAISE NOTICE 'ncm_codes bootstrap: % códigos. Itens ativos sem NCM: % (ver _ncm_missing_active_products).', nc, n;
END $$;
