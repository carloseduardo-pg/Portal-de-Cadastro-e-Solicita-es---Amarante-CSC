#!/usr/bin/env bash
# Carrega DATABASE_URL do .env (raiz ou backend) e exporta partes da conexão.
# Uso: source "$(dirname "$0")/_db_env.sh"
# Requer ROOT apontando para a raiz do mono-repo.

: "${ROOT:?ROOT deve estar definido antes de source _db_env.sh}"

_db_env_file=""
if [ -f "$ROOT/backend/.env" ]; then
  _db_env_file="$ROOT/backend/.env"
elif [ -f "$ROOT/.env" ]; then
  _db_env_file="$ROOT/.env"
fi

# Preferência: DATABASE_URL já exportada no shell (CI/VPS) > arquivo .env > default local.
if [ -z "${DATABASE_URL:-}" ] && [ -n "$_db_env_file" ]; then
  # shellcheck disable=SC1090
  DATABASE_URL="$(
    set -a
    # shellcheck disable=SC1090
    . "$_db_env_file"
    set +a
    printf '%s' "${DATABASE_URL:-}"
  )"
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="postgresql://postgree:postgree@127.0.0.1:5432/amarante?schema=public"
  export DATABASE_URL
  echo "AVISO: DATABASE_URL ausente — usando default local (postgree@amarante)."
fi

# Garante backend/.env alinhado (Prisma só lê backend/.env).
if [ -f "$ROOT/.env" ]; then
  if [ ! -f "$ROOT/backend/.env" ]; then
    cp "$ROOT/.env" "$ROOT/backend/.env"
    echo "OK  backend/.env criado a partir da raiz"
  else
    _root_url="$(
      set -a
      # shellcheck disable=SC1090
      . "$ROOT/.env"
      set +a
      printf '%s' "${DATABASE_URL:-}"
    )"
    _back_url="$(
      set -a
      # shellcheck disable=SC1090
      . "$ROOT/backend/.env"
      set +a
      printf '%s' "${DATABASE_URL:-}"
    )"
    if [ -n "$_root_url" ] && [ "$_root_url" != "$_back_url" ]; then
      echo "AVISO: DATABASE_URL diferente entre .env (raiz) e backend/.env"
      echo "       Usando backend/.env (Prisma). Alinhe os dois arquivos na VPS."
      echo "       raiz:    ${_root_url%%@*}@…"
      echo "       backend: ${_back_url%%@*}@…"
    fi
  fi
fi

# Parse postgresql://user:pass@host:port/db?...
_db_parse_url() {
  local url="$1"
  url="${url#postgresql://}"
  url="${url#postgres://}"

  local creds hostport dbpart
  creds="${url%%@*}"
  hostport="${url#*@}"
  hostport="${hostport%%/*}"
  dbpart="${url#*/}"
  dbpart="${dbpart%%\?*}"

  DB_USER="${creds%%:*}"
  DB_PASS="${creds#*:}"
  # Senha pode ter ":" — raro; se só user sem senha, PASS fica igual a USER → limpar
  if [ "$DB_PASS" = "$creds" ]; then
    DB_PASS=""
  fi
  # Decode mínimo de %40 etc. (senhas URL-encoded)
  if command -v python3 >/dev/null 2>&1; then
    DB_USER="$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$DB_USER")"
    DB_PASS="$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$DB_PASS")"
  fi

  if [[ "$hostport" == \[* ]]; then
    # IPv6 [addr]:port — raro em VPS simples
    DB_HOST="${hostport%%]*}"
    DB_HOST="${DB_HOST#[}"
    DB_PORT="${hostport##*:}"
  else
    DB_HOST="${hostport%%:*}"
    if [[ "$hostport" == *:* ]]; then
      DB_PORT="${hostport##*:}"
    else
      DB_PORT="5432"
    fi
  fi
  DB_NAME="${dbpart:-amarante}"
}

_db_parse_url "$DATABASE_URL"

# psql aceita a URL completa sem querystring (schema=... é do Prisma)
APP_URL="${DATABASE_URL%%\?*}"

# Admin opcional (criar role/DB). Defaults = dev local Amarante.
ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
ADMIN_PASS="${POSTGRES_ADMIN_PASS:-postgree}"
if [ -n "${POSTGRES_ADMIN_URL:-}" ]; then
  ADMIN_URL="$POSTGRES_ADMIN_URL"
else
  ADMIN_URL="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${DB_HOST}:${DB_PORT}/postgres"
fi

export DATABASE_URL APP_URL DB_USER DB_PASS DB_HOST DB_PORT DB_NAME
export ADMIN_USER ADMIN_PASS ADMIN_URL

# Escape aspas simples para SQL dinâmico
sql_quote() {
  printf "%s" "${1//\'/\'\'}"
}
