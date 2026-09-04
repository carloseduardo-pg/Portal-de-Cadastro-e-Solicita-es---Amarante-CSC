-- Código interno visível da solicitação (não é o UUID).
-- Formato: SOL-AAAA-NNNNN-XXX (ano + sequência cronológica + sufixo aleatório).

CREATE SEQUENCE IF NOT EXISTS request_code_seq;

ALTER TABLE "requests" ADD COLUMN "code" VARCHAR(24);

UPDATE "requests" r
SET "code" = 'SOL-'
  || to_char(r.created_at, 'YYYY')
  || '-'
  || lpad(n.seq::text, 5, '0')
  || '-'
  || upper(substr(md5(r.id::text), 1, 3))
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS seq
  FROM "requests"
) n
WHERE r.id = n.id;

UPDATE "requests"
SET "code" = 'SOL-' || to_char(NOW(), 'YYYY') || '-00000-TMP'
WHERE "code" IS NULL;

ALTER TABLE "requests" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "requests_code_key" ON "requests"("code");

SELECT setval(
  'request_code_seq',
  GREATEST(
    1,
    COALESCE(
      (
        SELECT MAX(NULLIF(split_part("code", '-', 3), '')::int)
        FROM "requests"
        WHERE split_part("code", '-', 3) ~ '^[0-9]+$'
      ),
      1
    )
  ),
  true
);
