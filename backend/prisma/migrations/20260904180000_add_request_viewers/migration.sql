-- Presença: quem está com a solicitação aberta (heartbeat no serviço).
CREATE TABLE "request_viewers" (
    "request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_viewers_pkey" PRIMARY KEY ("request_id","user_id")
);

CREATE INDEX "request_viewers_last_seen_at_idx" ON "request_viewers"("last_seen_at");

ALTER TABLE "request_viewers" ADD CONSTRAINT "request_viewers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_viewers" ADD CONSTRAINT "request_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
