#!/usr/bin/env bash
# Cria role/database Amarante se precisar — sem pedir senha.
# Se postgree@amarante já existir, apenas confirma e sai OK.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

HOST="127.0.0.1"
PORT="5432"
APP_USER="postgree"
APP_PASS="postgree"
APP_DB="amarante"

ADMIN_USER="postgres"
ADMIN_PASS="postgree"

APP_URL="postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/${APP_DB}"
ADMIN_URL="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${HOST}:${PORT}/postgres"

echo "==> Amarante DB setup"
echo "    ${APP_USER}@${HOST}:${PORT} → database ${APP_DB}"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERRO: psql não encontrado."
  exit 1
fi

if ! pg_isready -h "$HOST" -p "$PORT" >/dev/null 2>&1; then
  echo "ERRO: PostgreSQL não responde em $HOST:$PORT."
  exit 1
fi

# Caso feliz: já dá para usar o banco Amarante
if psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
  echo "OK  database já pronto — nada a criar"
  exit 0
fi

echo "Database ainda não acessível com ${APP_USER}. Tentando criar..."

# 1) Admin via senha (TCP)
if psql "$ADMIN_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -f "$ROOT/database/sql/01-create-role.sql"
  EXISTS=$(psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | tr -d '[:space:]')
  if [ "$EXISTS" != "1" ]; then
    psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${APP_DB} OWNER ${APP_USER};"
    echo "OK  database ${APP_DB} criado (admin TCP)"
  fi
# 2) Admin via socket local (peer), sem senha — comum no Fedora
elif psql -U "$ADMIN_USER" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  psql -U "$ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -f "$ROOT/database/sql/01-create-role.sql"
  EXISTS=$(psql -U "$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | tr -d '[:space:]')
  if [ "$EXISTS" != "1" ]; then
    psql -U "$ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${APP_DB} OWNER ${APP_USER};"
    echo "OK  database ${APP_DB} criado (admin socket)"
  fi
# 3) Usuário app com CREATEDB (se a role já existir)
elif psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE ${APP_DB} OWNER ${APP_USER};"
  echo "OK  database ${APP_DB} criado (pelo próprio ${APP_USER})"
else
  echo "ERRO: não foi possível criar o database automaticamente."
  echo "Crie manualmente e rode de novo: bash database/scripts/check.sh"
  exit 1
fi

if ! psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: database criado, mas ${APP_USER} ainda não conecta em ${APP_DB}."
  exit 1
fi

psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
echo "OK  setup concluído — rode: bash database/scripts/migrate.sh"
