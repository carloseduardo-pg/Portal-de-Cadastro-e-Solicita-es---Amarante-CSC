#!/usr/bin/env bash
# Aplica migrations pendentes. Seed só com RUN_SEED=true (npm run setup).
# Usa `migrate deploy` (não interativo) — evita migrations acidentais tipo "cadu".
# Credenciais: DATABASE_URL em backend/.env (alinha com a raiz via _db_env.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"

# shellcheck disable=SC1091
source "$ROOT/database/scripts/_db_env.sh"

if [ ! -f "$BACKEND/.env" ]; then
  echo "ERRO: falta backend/.env (e .env na raiz)."
  exit 1
fi

echo "==> Amarante migrate deploy (Prisma)"
echo "    ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
cd "$BACKEND"
# Garante que o processo Prisma vê a mesma URL resolvida pelos scripts.
export DATABASE_URL
npx prisma migrate deploy
npx prisma generate
echo "OK  migrations aplicadas"

echo "==> Amarante triggers / pg_trgm / ITM"
bash "$ROOT/database/scripts/apply-triggers.sh"

if [ "${RUN_SEED:-}" = "true" ]; then
  echo "==> Amarante seed (RUN_SEED=true)"
  npx prisma db seed
  echo "OK  seed infra (catálogo: npm run import:sap)"
else
  echo "OK  seed omitido — para popular dados locais: RUN_SEED=true npm run migrate  ou  npm run seed"
fi
