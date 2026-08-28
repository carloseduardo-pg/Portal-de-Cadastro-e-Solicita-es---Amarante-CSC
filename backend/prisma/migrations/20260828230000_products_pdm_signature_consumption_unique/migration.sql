-- pdm_signature + trava UNIQUE(family, signature) só para CONSUMPTION.
-- Antes de criar a unique: detecta colisões, grava relatório e NÃO falha a migration.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- Função de normalização (espelha buildPdmSignature no TypeScript)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_pdm_signature(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      upper(unaccent(coalesce(raw, ''))),
      '[[:punct:]]+',
      '',
      'g'
    ),
    '\s+',
    ' ',
    'g'
  ));
$$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pdm_signature" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pdm_family_id" UUID;

CREATE INDEX IF NOT EXISTS "products_pdm_signature_idx" ON "products"("pdm_signature");

-- Backfill assinatura + família (via group → subgroup)
UPDATE "products" p
SET
  "pdm_signature" = fn_pdm_signature(p."description_short"),
  "pdm_family_id" = sg."family_id"
FROM "groups" g
JOIN "subgroups" sg ON sg."id" = g."subgroup_id"
WHERE g."id" = p."group_id";

-- ---------------------------------------------------------------------------
-- Detectar colisões CONSUMPTION ANTES da unique — não aborta a carga
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_pdm_signature_collisions" (
  "detected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "family_id" UUID NOT NULL,
  "family_name" TEXT NOT NULL,
  "pdm_signature" TEXT NOT NULL,
  "description_sample" TEXT NOT NULL,
  "item_count" INT NOT NULL,
  "sap_codes" TEXT NOT NULL,
  "active_only" BOOLEAN NOT NULL DEFAULT true
);

DELETE FROM "_pdm_signature_collisions";

INSERT INTO "_pdm_signature_collisions" (
  "family_id", "family_name", "pdm_signature", "description_sample",
  "item_count", "sap_codes", "active_only"
)
SELECT
  p."pdm_family_id",
  f."name",
  p."pdm_signature",
  MIN(p."description_short"),
  COUNT(*)::int,
  string_agg(COALESCE(p."sap_code", p."unified_code", p."id"::text), ', ' ORDER BY p."sap_code" NULLS LAST),
  true
FROM "products" p
JOIN "families" f ON f."id" = p."pdm_family_id"
WHERE p."item_kind" = 'CONSUMPTION'
  AND p."active" = true
  AND p."pdm_signature" IS NOT NULL
  AND p."pdm_family_id" IS NOT NULL
GROUP BY p."pdm_family_id", f."name", p."pdm_signature"
HAVING COUNT(*) > 1;

DO $$
DECLARE
  r RECORD;
  n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM "_pdm_signature_collisions";
  RAISE NOTICE 'PDM signature collisions (CONSUMPTION ativos): % — ver _pdm_signature_collisions e COLLISIONS.md', n;
  FOR r IN
    SELECT family_name, description_sample, item_count, sap_codes
    FROM "_pdm_signature_collisions"
    ORDER BY family_name, description_sample
  LOOP
    RAISE NOTICE 'COLISAO | % | % | n=% | %',
      r.family_name, r.description_sample, r.item_count, r.sap_codes;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Trigger: mantém pdm_signature + pdm_family_id em INSERT/UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_products_pdm_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  NEW."pdm_signature" := fn_pdm_signature(NEW."description_short");

  SELECT sg."family_id" INTO v_family_id
  FROM "groups" g
  JOIN "subgroups" sg ON sg."id" = g."subgroup_id"
  WHERE g."id" = NEW."group_id";

  NEW."pdm_family_id" := v_family_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_biu_pdm_fields ON "products";
CREATE TRIGGER trg_products_biu_pdm_fields
  BEFORE INSERT OR UPDATE OF "description_short", "group_id", "item_kind"
  ON "products"
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_pdm_fields();

-- ---------------------------------------------------------------------------
-- Impede NOVAS duplicatas CONSUMPTION (mesmo com legado sujo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_products_prevent_consumption_pdm_dup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."item_kind" IS DISTINCT FROM 'CONSUMPTION'::"ItemKind" THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW."pdm_signature" IS NOT DISTINCT FROM OLD."pdm_signature"
     AND NEW."pdm_family_id" IS NOT DISTINCT FROM OLD."pdm_family_id"
     AND NEW."item_kind" IS NOT DISTINCT FROM OLD."item_kind" THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "products" o
    WHERE o."item_kind" = 'CONSUMPTION'::"ItemKind"
      AND o."pdm_family_id" IS NOT DISTINCT FROM NEW."pdm_family_id"
      AND o."pdm_signature" IS NOT DISTINCT FROM NEW."pdm_signature"
      AND o."id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION
      'Duplicidade CONSUMPTION: já existe item com a mesma assinatura PDM nesta família (pdm_signature).'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_biu_prevent_consumption_pdm_dup ON "products";
CREATE TRIGGER trg_products_biu_prevent_consumption_pdm_dup
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_prevent_consumption_pdm_dup();

-- ---------------------------------------------------------------------------
-- UNIQUE parcial: só cria se NÃO houver colisão ativa
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM "_pdm_signature_collisions";
  IF n = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "products_consumption_family_pdm_signature_key"
      ON "products" ("pdm_family_id", "pdm_signature")
      WHERE "item_kind" = 'CONSUMPTION'::"ItemKind"
        AND "pdm_signature" IS NOT NULL
        AND "pdm_family_id" IS NOT NULL;
    RAISE NOTICE 'UNIQUE(pdm_family_id, pdm_signature) criada para CONSUMPTION.';
  ELSE
    RAISE NOTICE
      'UNIQUE(pdm_family_id, pdm_signature) ADIADA: % colisões ativas listadas em _pdm_signature_collisions / COLLISIONS.md. Trigger anti-dup novo permanece ativo.',
      n;
  END IF;
END $$;
