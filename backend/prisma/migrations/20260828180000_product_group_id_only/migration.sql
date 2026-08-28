-- Produto passa a ter apenas group_id (folha). Família/subgrupo via FK.
-- request_items.group_id para persistir classificação do item.

-- 1) Backfill group_id ausente a partir da família legada
DO $$
DECLARE
  p RECORD;
  sg_id UUID;
  g_id UUID;
BEGIN
  FOR p IN
    SELECT id, family_id
    FROM products
    WHERE group_id IS NULL AND family_id IS NOT NULL
  LOOP
    SELECT id INTO sg_id FROM subgroups WHERE family_id = p.family_id ORDER BY code LIMIT 1;
    IF sg_id IS NULL THEN
      sg_id := gen_random_uuid();
      INSERT INTO subgroups (id, code, name, active, created_at, updated_at, family_id)
      VALUES (sg_id, left('MIG-SG-' || p.family_id::text, 64), 'GERAL', true, NOW(), NOW(), p.family_id);
    END IF;

    SELECT id INTO g_id FROM groups WHERE subgroup_id = sg_id ORDER BY code LIMIT 1;
    IF g_id IS NULL THEN
      g_id := gen_random_uuid();
      INSERT INTO groups (id, code, name, active, created_at, updated_at, subgroup_id)
      VALUES (g_id, left('MIG-G-' || p.family_id::text, 64), 'GERAL', true, NOW(), NOW(), sg_id);
    END IF;

    UPDATE products SET group_id = g_id WHERE id = p.id;
  END LOOP;
END $$;

-- 2) Remover family_id do produto
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_family_id_fkey";
ALTER TABLE "products" DROP COLUMN IF EXISTS "family_id";

ALTER TABLE "products" ALTER COLUMN "group_id" SET NOT NULL;

-- 3) group_id no item da solicitação
ALTER TABLE "request_items" ADD COLUMN IF NOT EXISTS "group_id" UUID;
ALTER TABLE "request_items" DROP CONSTRAINT IF EXISTS "request_items_group_id_fkey";
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
