-- Quem abriu primeiro detém a análise; heartbeat só atualiza last_seen_at.
ALTER TABLE "request_viewers"
  ADD COLUMN "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "request_viewers"
SET "joined_at" = "last_seen_at";

CREATE INDEX "request_viewers_joined_at_idx" ON "request_viewers"("joined_at");
