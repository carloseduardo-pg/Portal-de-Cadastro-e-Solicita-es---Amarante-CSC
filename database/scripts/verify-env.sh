#!/usr/bin/env bash
# Valida .env + conexão PostgreSQL antes de subir a API (uso na VPS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/database/scripts/_db_env.sh"

echo "==> verify-env"
echo "    target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

if [ ! -f "$ROOT/.env" ]; then
  echo "ERRO: falta .env na raiz. cp .env.example .env e edite DATABASE_URL."
  exit 1
fi
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERRO: falta backend/.env (deveria ter sido sincronizado)."
  exit 1
fi

if ! cmp -s "$ROOT/.env" "$ROOT/backend/.env" 2>/dev/null; then
  echo "ERRO: .env (raiz) e backend/.env divergem."
  echo "      Rode: cp .env backend/.env   ou  bash database/scripts/migrate.sh"
  exit 1
fi
echo "OK  .env alinhado (raiz = backend)"

if [ "$DB_USER" = "postgres" ]; then
  echo "ERRO: DATABASE_URL não deve usar o usuário 'postgres' para a aplicação."
  echo "      Crie/use o usuário da app e atualize DATABASE_URL nos dois .env."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERRO: psql não encontrado."
  exit 1
fi

if ! psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: falha de autenticação/conexão com DATABASE_URL."
  echo "      Teste: psql \"\$DATABASE_URL\" -c 'SELECT current_user, current_database();'"
  exit 1
fi

psql "$APP_URL" -c 'SELECT current_user AS usr, current_database() AS db;'
echo "OK  PostgreSQL autentica com o usuário da aplicação"
