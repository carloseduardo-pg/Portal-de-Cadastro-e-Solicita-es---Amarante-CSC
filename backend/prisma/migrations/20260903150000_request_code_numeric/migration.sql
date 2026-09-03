-- Código interno da solicitação: só dígitos crescentes, sem zeros à esquerda, máx. 10 dígitos.

UPDATE "requests" r
SET "code" = n.seq::text
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS seq
  FROM "requests"
) n
WHERE r.id = n.id;

SELECT setval(
  'request_code_seq',
  GREATEST(
    1,
    COALESCE((SELECT MAX(NULLIF("code", '')::bigint) FROM "requests" WHERE "code" ~ '^[0-9]+$'), 1)
  ),
  true
);

ALTER TABLE "requests" ALTER COLUMN "code" TYPE VARCHAR(10);
