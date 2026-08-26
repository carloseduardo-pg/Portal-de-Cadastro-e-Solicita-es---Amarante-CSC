-- Perfis simplificados + rascunhos abertos passam para SOLICITANTE (caixa do solicitante)
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SOLICITANTE', 'APROVADOR', 'COMPLIANCE');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'SOLICITANTE';

UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'admin@amarante.local';
UPDATE "users" SET "role" = 'SOLICITANTE' WHERE "email" = 'solicitante@amarante.local';
UPDATE "users" SET "role" = 'APROVADOR' WHERE "email" = 'erika@amarante.local';

UPDATE "requests"
SET "state" = 'SOLICITANTE',
    "submitted_at" = COALESCE("submitted_at", "created_at"),
    "expires_at" = NULL
WHERE "state" = 'RASCUNHO'
  AND "closed_at" IS NULL;

UPDATE "request_stages"
SET "stage" = 'SOLICITANTE'
WHERE "stage" = 'RASCUNHO'
  AND "finished_at" IS NULL;
