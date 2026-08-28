-- Ativo fixo: flag na solicitação + etapa IMOBILIZADO + perfil APROVADOR_IMOBILIZADO

ALTER TYPE "RequestState" ADD VALUE IF NOT EXISTS 'IMOBILIZADO';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'APROVADOR_IMOBILIZADO';

ALTER TABLE "requests"
  ADD COLUMN IF NOT EXISTS "fixed_asset" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "requests_fixed_asset_idx" ON "requests"("fixed_asset");
