-- PDM: atributos passam a pertencer ao SUBGRUPO (não à família).
-- Base definitiva será recarregada pelo seed/import — apaga valores e definições atuais
-- em vez de duplicar atributos de família em todos os subgrupos (evita lixo).

DELETE FROM "product_attribute_values";
DELETE FROM "product_attributes";

ALTER TABLE "product_attributes" DROP CONSTRAINT IF EXISTS "product_attributes_family_id_fkey";
ALTER TABLE "product_attributes" DROP COLUMN "family_id";
ALTER TABLE "product_attributes" ADD COLUMN "subgroup_id" UUID NOT NULL;

ALTER TABLE "product_attributes"
  ADD CONSTRAINT "product_attributes_subgroup_id_fkey"
  FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "product_attributes_subgroup_id_idx" ON "product_attributes"("subgroup_id");
