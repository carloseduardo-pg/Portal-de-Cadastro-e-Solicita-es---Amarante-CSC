-- Eixo do lote: requests.subgroup_id (nullable nesta etapa).
-- family_id permanece obrigatório (coluna derivada nas próximas etapas).

ALTER TABLE "requests" ADD COLUMN "subgroup_id" UUID;

ALTER TABLE "requests"
  ADD CONSTRAINT "requests_subgroup_id_fkey"
  FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "requests_subgroup_id_idx" ON "requests"("subgroup_id");
