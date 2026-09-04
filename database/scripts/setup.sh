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

# Executa SQL como admin no database $1.
admin_psql_db() {
  local db="$1"
  shift
  local url="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${HOST}:${PORT}/${db}"
  if psql "$url" -c 'SELECT 1' >/dev/null 2>&1; then
    psql "$url" -v ON_ERROR_STOP=1 "$@"
  elif command -v sudo >/dev/null 2>&1 && sudo -n -u "$ADMIN_USER" psql -d "$db" -c 'SELECT 1' >/dev/null 2>&1; then
    sudo -n -u "$ADMIN_USER" psql -d "$db" -v ON_ERROR_STOP=1 "$@"
  elif command -v sudo >/dev/null 2>&1 && [ -t 0 ]; then
    sudo -u "$ADMIN_USER" psql -d "$db" -v ON_ERROR_STOP=1 "$@"
  else
    return 1
  fi
}

# PostgreSQL 15+: public não dá CREATE para PUBLIC.
grant_public_schema() {
  admin_psql_db postgres -c "ALTER DATABASE ${APP_DB} OWNER TO ${APP_USER};"
  admin_psql_db "$APP_DB" -c "GRANT USAGE, CREATE ON SCHEMA public TO ${APP_USER};"
}

# unaccent / pg_trgm / pgcrypto vêm do pacote contrib (Fedora: postgresql-contrib).
ensure_extensions_available() {
  MISSING=$(psql "$APP_URL" -tAc "SELECT string_agg(n, ', ') FROM unnest(ARRAY['unaccent','pg_trgm','pgcrypto']) AS n WHERE NOT EXISTS (SELECT 1 FROM pg_available_extensions e WHERE e.name = n);")
  if [ -n "$MISSING" ]; then
    echo "ERRO: extensões ausentes no sistema: ${MISSING}"
    echo "No Fedora: sudo dnf install -y postgresql-contrib"
    echo "Depois: npm run setup"
    exit 1
  fi
}

ensure_app_privileges() {
  CAN_CREATE=$(psql "$APP_URL" -tAc "SELECT has_schema_privilege('public','CREATE')" | tr -d '[:space:]')
  if [ "$CAN_CREATE" = "t" ]; then
    return 0
  fi
  echo "    Ajustando OWNER/GRANT do schema public (PostgreSQL 15+)..."
  if ! grant_public_schema; then
    echo "ERRO: ${APP_USER} conecta em ${APP_DB}, mas sem CREATE no schema public."
    echo "Rode no terminal:"
    echo "  sudo -u postgres psql -d postgres -c \"ALTER DATABASE ${APP_DB} OWNER TO ${APP_USER};\""
    echo "  sudo -u postgres psql -d ${APP_DB} -c \"GRANT USAGE, CREATE ON SCHEMA public TO ${APP_USER};\""
    exit 1
  fi
  CAN_CREATE=$(psql "$APP_URL" -tAc "SELECT has_schema_privilege('public','CREATE')" | tr -d '[:space:]')
  if [ "$CAN_CREATE" != "t" ]; then
    echo "ERRO: ainda sem CREATE em public para ${APP_USER}."
    exit 1
  fi
  echo "OK  ${APP_USER} tem CREATE em public"
}

# Caso feliz: já dá para usar o banco Amarante
if psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
  ensure_app_privileges
  ensure_extensions_available
  echo "OK  database já pronto"
  exit 0
fi

echo "Database ainda não acessível com ${APP_USER}. Tentando criar..."

# Cria role postgree + database amarante. $1... = prefixo do psql admin.
create_role_and_db() {
  "$@" -v ON_ERROR_STOP=1 -f "$ROOT/database/sql/01-create-role.sql"
  EXISTS=$("$@" -tAc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | tr -d '[:space:]')
  if [ "$EXISTS" != "1" ]; then
    "$@" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${APP_DB} OWNER ${APP_USER};"
    echo "OK  database ${APP_DB} criado"
  else
    echo "OK  database ${APP_DB} já existia — role alinhada"
  fi
  # Libera o caminho admin TCP nas próximas execuções (dev local).
  "$@" -v ON_ERROR_STOP=1 -c "ALTER ROLE ${ADMIN_USER} WITH PASSWORD '${ADMIN_PASS}';"
}

# 1) Admin via senha (TCP)
if psql "$ADMIN_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db psql "$ADMIN_URL"
# 2) Admin via socket local (peer), sem senha — só funciona se o OS user for postgres
elif psql -U "$ADMIN_USER" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db psql -U "$ADMIN_USER" -d postgres
# 3) Usuário app com CREATEDB (se a role já existir)
elif psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE ${APP_DB} OWNER ${APP_USER};"
  echo "OK  database ${APP_DB} criado (pelo próprio ${APP_USER})"
# 4) Fedora: peer do superuser só via `sudo -u postgres`
elif command -v sudo >/dev/null 2>&1 && sudo -n -u "$ADMIN_USER" psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db sudo -n -u "$ADMIN_USER" psql -d postgres
elif command -v sudo >/dev/null 2>&1 && [ -t 0 ]; then
  echo "    Pedindo sudo para o usuário OS ${ADMIN_USER} (peer no Fedora)..."
  if sudo -u "$ADMIN_USER" psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
    create_role_and_db sudo -u "$ADMIN_USER" psql -d postgres
  else
    echo "ERRO: sudo recusado ou PostgreSQL sem role ${ADMIN_USER}."
    exit 1
  fi
else
  echo "ERRO: não foi possível criar o database automaticamente."
  echo "No Fedora a role ${APP_USER} ainda não existe e o admin ${ADMIN_USER} só aceita peer."
  echo "Rode uma vez no terminal (pede senha do sudo):"
  echo "  sudo -u postgres psql -d postgres -f database/sql/01-create-role.sql"
  echo "  sudo -u postgres psql -d postgres -c \"CREATE DATABASE ${APP_DB} OWNER ${APP_USER};\""
  echo "Depois: npm run setup"
  exit 1
fi

if ! psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: database criado, mas ${APP_USER} ainda não conecta em ${APP_DB}."
  exit 1
fi

psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
ensure_app_privileges
ensure_extensions_available
echo "OK  setup concluído — rode: bash database/scripts/migrate.sh"
