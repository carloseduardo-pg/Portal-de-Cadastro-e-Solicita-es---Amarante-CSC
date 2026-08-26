#!/usr/bin/env bash
# Reaplica triggers Amarante (idempotente)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL="$ROOT/database/sql/03-triggers.sql"
URL="${DATABASE_URL:-postgresql://postgree:postgree@127.0.0.1:5432/amarante}"

if [ ! -f "$SQL" ]; then
  echo "ERRO: não encontrado $SQL"
  exit 1
fi

echo "==> Amarante apply-triggers"
echo "    $SQL"
psql "$URL" -v ON_ERROR_STOP=1 -f "$SQL"

echo "==> Triggers ativos"
psql "$URL" -c "
SELECT c.relname AS tabela, t.tgname AS trigger
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgname LIKE 'trg_%'
ORDER BY 1, 2;
"

echo "OK  triggers aplicados"
