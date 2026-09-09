#!/usr/bin/env bash
# Carrega DATABASE_URL do .env e exporta partes da conexão.
# Fonte da verdade: `.env` na raiz → espelhado em `backend/.env` (Prisma/Nest).
# Uso: source "$(dirname "$0")/_db_env.sh"
# Requer ROOT apontando para a raiz do mono-repo.

: "${ROOT:?ROOT deve estar definido antes de source _db_env.sh}"

# Raiz manda: evita API lendo backend/.env velho (ex.: postgres) enquanto a raiz está correta.
if [ -f "$ROOT/.env" ]; then
  if [ ! -f "$ROOT/backend/.env" ] || ! cmp -s "$ROOT/.env" "$ROOT/backend/.env" 2>/dev/null; then
    cp "$ROOT/.env" "$ROOT/backend/.env"
    echo "OK  backend/.env sincronizado a partir da raiz (.env = fonte da verdade)"
  fi
fi

_db_env_file=""
if [ -f "$ROOT/.env" ]; then
  _db_env_file="$ROOT/.env"
elif [ -f "$ROOT/backend/.env" ]; then
  _db_env_file="$ROOT/backend/.env"
fi

# Preferência: DATABASE_URL já no shell (CI/systemd) > arquivo .env > default local.
if [ -z "${DATABASE_URL:-}" ] && [ -n "$_db_env_file" ]; then
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
  if [ "$DB_PASS" = "$creds" ]; then
    DB_PASS=""
  fi
  if command -v python3 >/dev/null 2>&1; then
    DB_USER="$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$DB_USER")"
    DB_PASS="$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$DB_PASS")"
  fi

  if [[ "$hostport" == \[* ]]; then
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

APP_URL="${DATABASE_URL%%\?*}"

ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
ADMIN_PASS="${POSTGRES_ADMIN_PASS:-postgree}"
if [ -n "${POSTGRES_ADMIN_URL:-}" ]; then
  ADMIN_URL="$POSTGRES_ADMIN_URL"
else
  ADMIN_URL="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${DB_HOST}:${DB_PORT}/postgres"
fi

if [ "$DB_USER" = "postgres" ]; then
  echo "AVISO: DATABASE_URL usa o usuário superuser 'postgres'."
  echo "       Em VPS o correto é o usuário da aplicação (criado no setup), não o admin."
  echo "       POSTGRES_ADMIN_* é só para criar role/DB — a API deve usar outro usuário."
fi

export DATABASE_URL APP_URL DB_USER DB_PASS DB_HOST DB_PORT DB_NAME
export ADMIN_USER ADMIN_PASS ADMIN_URL

sql_quote() {
  printf "%s" "${1//\'/\'\'}"
}
