-- Hierarquia SAP B1: Família → Subgrupo → Grupo (folha).
-- Códigos passam a VARCHAR(64); product.measure_unit_id nullable; product.group_id.

-- 1) Produto: UM opcional + FK para grupo folha
ALTER TABLE "products" ALTER COLUMN "measure_unit_id" DROP NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "group_id" UUID;

-- sap_code único (chave natural do import SAP)
DROP INDEX IF EXISTS "products_sap_code_key";
CREATE UNIQUE INDEX "products_sap_code_key" ON "products"("sap_code");

-- 2) Ampliar códigos (fim dos 1/3/6 dígitos Semplice)
ALTER TABLE "groups" ALTER COLUMN "code" TYPE VARCHAR(64);
ALTER TABLE "subgroups" ALTER COLUMN "code" TYPE VARCHAR(64);
ALTER TABLE "families" ALTER COLUMN "code" TYPE VARCHAR(64);

-- 3) Novas colunas de FK na direção SAP
ALTER TABLE "subgroups" ADD COLUMN IF NOT EXISTS "family_id" UUID;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "subgroup_id" UUID;

-- 4) Migrar dados legados: cada família ganha subgrupo+grupo dedicados (evita colisão N:1)
DO $$
DECLARE
  f RECORD;
  old_sg RECORD;
  old_g RECORD;
  new_sg_id UUID;
  new_g_id UUID;
BEGIN
  FOR f IN SELECT id, code, name, subgroup_id FROM families LOOP
    SELECT id, code, name, group_id INTO old_sg FROM subgroups WHERE id = f.subgroup_id;
    IF old_sg.id IS NULL THEN
      CONTINUE;
    END IF;
    SELECT id, code, name INTO old_g FROM groups WHERE id = old_sg.group_id;

    new_sg_id := gen_random_uuid();
    INSERT INTO subgroups (id, code, name, active, created_at, updated_at, group_id, family_id)
    VALUES (
      new_sg_id,
      left('MIG-SG-' || f.code, 64),
      old_sg.name,
      true,
      NOW(),
      NOW(),
      old_sg.group_id,
      f.id
    );

    new_g_id := gen_random_uuid();
    INSERT INTO groups (id, code, name, active, created_at, updated_at, subgroup_id)
    VALUES (
      new_g_id,
      left('MIG-G-' || f.code, 64),
      COALESCE(old_g.name, 'GERAL'),
      true,
      NOW(),
      NOW(),
      new_sg_id
    );

    UPDATE products SET group_id = new_g_id WHERE family_id = f.id;
  END LOOP;
END $$;

-- 5) Remover FKs/colunas da direção antiga (Grupo → Subgrupo → Família)
ALTER TABLE "families" DROP CONSTRAINT IF EXISTS "families_subgroup_id_fkey";
ALTER TABLE "families" DROP COLUMN IF EXISTS "subgroup_id";

ALTER TABLE "subgroups" DROP CONSTRAINT IF EXISTS "subgroups_group_id_fkey";
ALTER TABLE "subgroups" DROP COLUMN IF EXISTS "group_id";

-- Remover nós órfãos da árvore antiga (sem family_id / sem subgroup_id)
DELETE FROM "subgroups" WHERE "family_id" IS NULL;
DELETE FROM "groups" WHERE "subgroup_id" IS NULL;

-- 6) Constraints novas
ALTER TABLE "subgroups" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_family_id_fkey"
  FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "groups" ALTER COLUMN "subgroup_id" SET NOT NULL;
ALTER TABLE "groups" ADD CONSTRAINT "groups_subgroup_id_fkey"
  FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "families_name_key" ON "families"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "subgroups_family_id_name_key" ON "subgroups"("family_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "groups_subgroup_id_name_key" ON "groups"("subgroup_id", "name");
