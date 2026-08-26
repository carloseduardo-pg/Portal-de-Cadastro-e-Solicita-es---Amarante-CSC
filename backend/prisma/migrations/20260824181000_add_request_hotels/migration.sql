-- Multi-hotel por solicitação (registro em lote na base)
CREATE TABLE IF NOT EXISTS "request_hotels" (
    "request_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    CONSTRAINT "request_hotels_pkey" PRIMARY KEY ("request_id","hotel_id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_hotels_request_id_fkey'
  ) THEN
    ALTER TABLE "request_hotels" ADD CONSTRAINT "request_hotels_request_id_fkey"
      FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_hotels_hotel_id_fkey'
  ) THEN
    ALTER TABLE "request_hotels" ADD CONSTRAINT "request_hotels_hotel_id_fkey"
      FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "request_hotels" ("request_id", "hotel_id")
SELECT "id", "hotel_id" FROM "requests"
ON CONFLICT DO NOTHING;
