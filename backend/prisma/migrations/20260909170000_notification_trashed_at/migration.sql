-- Soft-delete: notificações lidas arquivadas pelo usuário vão para a lixeira.
ALTER TABLE "notifications" ADD COLUMN "trashed_at" TIMESTAMPTZ;

CREATE INDEX "notifications_user_id_trashed_at_idx" ON "notifications"("user_id", "trashed_at");
