-- ITM-11: subgroup_id torna-se eixo obrigatório do lote.
-- Pré-requisito: zero requests com subgroup_id NULL (legado de teste removido).

UPDATE "requests"
SET "subgroup_id" = (
  SELECT g.subgroup_id
  FROM request_items ri
  JOIN groups g ON g.id = ri.group_id
  WHERE ri.request_id = requests.id
    AND g.subgroup_id IS NOT NULL
  GROUP BY g.subgroup_id
  HAVING COUNT(DISTINCT g.subgroup_id) = 1
  LIMIT 1
)
WHERE "subgroup_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM requests WHERE subgroup_id IS NULL) THEN
    RAISE EXCEPTION
      'requests.subgroup_id ainda tem NULLs — limpe legados antes do NOT NULL';
  END IF;
END $$;

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_subgroup_id_fkey";

ALTER TABLE "requests"
  ALTER COLUMN "subgroup_id" SET NOT NULL;

ALTER TABLE "requests"
  ADD CONSTRAINT "requests_subgroup_id_fkey"
  FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
