#!/usr/bin/env bash
# Cria role/database da aplicação se precisar — credenciais vêm do DATABASE_URL (.env).
# Default local: postgree/postgree @ amarante (ver .env.example).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/database/scripts/_db_env.sh"

APP_USER="$DB_USER"
APP_PASS="$DB_PASS"
APP_DB="$DB_NAME"
HOST="$DB_HOST"
PORT="$DB_PORT"

echo "==> Amarante DB setup"
echo "    ${APP_USER}@${HOST}:${PORT} → database ${APP_DB}"
echo "    (fonte: DATABASE_URL do .env / ambiente)"

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
  admin_psql_db postgres -c "ALTER DATABASE ${APP_DB} OWNER TO \"${APP_USER}\";"
  admin_psql_db "$APP_DB" -c "GRANT USAGE, CREATE ON SCHEMA public TO \"${APP_USER}\";"
}

# unaccent / pg_trgm / pgcrypto vêm do pacote contrib.
ensure_extensions_available() {
  MISSING=$(psql "$APP_URL" -tAc "SELECT string_agg(n, ', ') FROM unnest(ARRAY['unaccent','pg_trgm','pgcrypto']) AS n WHERE NOT EXISTS (SELECT 1 FROM pg_available_extensions e WHERE e.name = n);")
  if [ -n "$MISSING" ]; then
    echo "ERRO: extensões ausentes no sistema: ${MISSING}"
    echo "Instale o pacote contrib do PostgreSQL e rode de novo: npm run setup"
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
    echo "  sudo -u postgres psql -d postgres -c \"ALTER DATABASE ${APP_DB} OWNER TO \\\"${APP_USER}\\\";\""
    echo "  sudo -u postgres psql -d ${APP_DB} -c \"GRANT USAGE, CREATE ON SCHEMA public TO \\\"${APP_USER}\\\";\""
    exit 1
  fi
  CAN_CREATE=$(psql "$APP_URL" -tAc "SELECT has_schema_privilege('public','CREATE')" | tr -d '[:space:]')
  if [ "$CAN_CREATE" != "t" ]; then
    echo "ERRO: ainda sem CREATE em public para ${APP_USER}."
    exit 1
  fi
  echo "OK  ${APP_USER} tem CREATE em public"
}

# Caso feliz: já dá para usar o banco da aplicação
if psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
  ensure_app_privileges
  ensure_extensions_available
  echo "OK  database já pronto (usuário do DATABASE_URL)"
  exit 0
fi

echo "Database ainda não acessível com ${APP_USER}. Tentando criar role/DB..."

USER_SQL="$APP_USER"
PASS_SQL="$(sql_quote "$APP_PASS")"

create_role_sql() {
  cat <<EOF
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${USER_SQL}') THEN
    CREATE ROLE "${USER_SQL}" LOGIN PASSWORD '${PASS_SQL}' CREATEDB;
  ELSE
    ALTER ROLE "${USER_SQL}" WITH LOGIN PASSWORD '${PASS_SQL}' CREATEDB;
  END IF;
END
\$\$;
SELECT 'OK role ${USER_SQL}' AS status;
EOF
}

# Cria role da aplicação + database. $1... = prefixo do psql admin.
create_role_and_db() {
  create_role_sql | "$@" -v ON_ERROR_STOP=1 -f -
  EXISTS=$("$@" -tAc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | tr -d '[:space:]')
  if [ "$EXISTS" != "1" ]; then
    "$@" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${APP_DB} OWNER \"${APP_USER}\";"
    echo "OK  database ${APP_DB} criado (owner ${APP_USER})"
  else
    echo "OK  database ${APP_DB} já existia — role alinhada"
  fi
  # Só tenta setar senha do admin no default local (dev).
  if [ "$ADMIN_USER" = "postgres" ] && [ "$ADMIN_PASS" = "postgree" ]; then
    "$@" -v ON_ERROR_STOP=1 -c "ALTER ROLE ${ADMIN_USER} WITH PASSWORD '${ADMIN_PASS}';" 2>/dev/null || true
  fi
}

# 1) Admin via senha (TCP)
if psql "$ADMIN_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db psql "$ADMIN_URL"
# 2) Admin via socket local (peer)
elif psql -U "$ADMIN_USER" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db psql -U "$ADMIN_USER" -d postgres
# 3) Usuário app com CREATEDB (se a role já existir)
elif psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -c 'SELECT 1' >/dev/null 2>&1; then
  EXISTS=$(psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | tr -d '[:space:]')
  if [ "$EXISTS" != "1" ]; then
    psql "postgresql://${APP_USER}:${APP_PASS}@${HOST}:${PORT}/postgres" -v ON_ERROR_STOP=1 \
      -c "CREATE DATABASE ${APP_DB} OWNER \"${APP_USER}\";"
    echo "OK  database ${APP_DB} criado (pelo próprio ${APP_USER})"
  fi
# 4) sudo -u postgres (Fedora / muitas VPS)
elif command -v sudo >/dev/null 2>&1 && sudo -n -u "$ADMIN_USER" psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  create_role_and_db sudo -n -u "$ADMIN_USER" psql -d postgres
elif command -v sudo >/dev/null 2>&1 && [ -t 0 ]; then
  echo "    Pedindo sudo para o usuário OS ${ADMIN_USER}..."
  if sudo -u "$ADMIN_USER" psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
    create_role_and_db sudo -u "$ADMIN_USER" psql -d postgres
  else
    echo "ERRO: sudo recusado ou PostgreSQL sem role ${ADMIN_USER}."
    exit 1
  fi
else
  echo "ERRO: não foi possível criar o database automaticamente."
  echo "Confira DATABASE_URL no .env / backend/.env (usuário, senha, host, database)."
  echo "Ou crie manualmente a role/DB e garanta que ${APP_USER} conecta em ${APP_DB}."
  echo "Admin opcional: POSTGRES_ADMIN_URL ou POSTGRES_ADMIN_USER / POSTGRES_ADMIN_PASS"
  exit 1
fi

if ! psql "$APP_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "ERRO: database criado, mas ${APP_USER} ainda não conecta em ${APP_DB}."
  echo "Verifique a senha em DATABASE_URL."
  exit 1
fi

psql "$APP_URL" -c 'SELECT current_database() AS db, current_user AS usr;'
ensure_app_privileges
ensure_extensions_available
echo "OK  setup concluído — rode: bash database/scripts/migrate.sh"
