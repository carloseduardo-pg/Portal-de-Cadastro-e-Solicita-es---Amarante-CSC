-- Liga notificação à solicitação da caixa de entrada.
ALTER TABLE "notifications"
  ADD COLUMN "request_id" UUID;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_request_id_user_id_idx"
  ON "notifications"("request_id", "user_id");
