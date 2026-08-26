#!/usr/bin/env bash
# Verifica conexão e contagens do domínio Amarante
set -euo pipefail

HOST="127.0.0.1"
PORT="5432"
USER="postgree"
PASS="postgree"
DB="amarante"
URL="postgresql://${USER}:${PASS}@${HOST}:${PORT}/${DB}"

echo "==> Amarante DB check ($USER@$HOST:$PORT/$DB)"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERRO: pg_isready não encontrado. Instale o cliente PostgreSQL."
  exit 1
fi

if ! pg_isready -h "$HOST" -p "$PORT" >/dev/null 2>&1; then
  echo "ERRO: PostgreSQL não responde em $HOST:$PORT. Inicie o serviço local."
  exit 1
fi
echo "OK  serviço no ar"

if ! psql "$URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: não conectou no database \"$DB\"."
  echo "Rode: bash database/scripts/setup.sh"
  exit 1
fi

psql "$URL" -c "SELECT current_database() AS db, current_user AS usr;"

psql "$URL" -c "
SELECT 'hotels' AS tabela, COUNT(*)::int AS qtd FROM hotels
UNION ALL SELECT 'products', COUNT(*)::int FROM products
UNION ALL SELECT 'product_hotels', COUNT(*)::int FROM product_hotels
UNION ALL SELECT 'requests', COUNT(*)::int FROM requests
UNION ALL SELECT 'users', COUNT(*)::int FROM users
ORDER BY 1;
"

echo "OK  conexão Amarante"
