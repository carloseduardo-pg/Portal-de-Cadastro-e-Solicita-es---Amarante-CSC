-- Filas abertas que estavam em APROVADOR no modelo antigo passam para SOLICITANTE
-- (caixa de entrada do solicitante). Encerradas APROVADO permanecem para histórico.
UPDATE "requests"
SET "state" = 'SOLICITANTE'
WHERE "state" = 'APROVADOR'
  AND "closed_at" IS NULL;

UPDATE "request_stages"
SET "stage" = 'SOLICITANTE'
WHERE "stage" = 'APROVADOR'
  AND "finished_at" IS NULL;
