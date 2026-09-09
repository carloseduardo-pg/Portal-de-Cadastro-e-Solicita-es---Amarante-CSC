#!/usr/bin/env bash
# Verifica conexão e contagens do domínio Amarante (usa DATABASE_URL do .env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/database/scripts/_db_env.sh"

echo "==> Amarante DB check (${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME})"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERRO: pg_isready não encontrado. Instale o cliente PostgreSQL."
  exit 1
fi

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "ERRO: PostgreSQL não responde em ${DB_HOST}:${DB_PORT}. Inicie o serviço."
  exit 1
fi
echo "OK  serviço no ar"

if ! psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: não conectou no database \"${DB_NAME}\" como ${DB_USER}."
  echo "Confira DATABASE_URL em backend/.env (ou .env na raiz)."
  echo "Rode: bash database/scripts/setup.sh"
  exit 1
fi

psql "$APP_URL" -c "SELECT current_database() AS db, current_user AS usr;"

psql "$APP_URL" -c "
SELECT 'hotels' AS tabela, COUNT(*)::int AS qtd FROM hotels
UNION ALL SELECT 'products', COUNT(*)::int FROM products
UNION ALL SELECT 'product_hotels', COUNT(*)::int FROM product_hotels
UNION ALL SELECT 'requests', COUNT(*)::int FROM requests
UNION ALL SELECT 'users', COUNT(*)::int FROM users
ORDER BY 1;
"

echo "OK  conexão Amarante"
