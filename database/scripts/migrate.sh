#!/usr/bin/env bash
# Aplica migrations pendentes. Seed só com RUN_SEED=true (npm run setup).
# Usa `migrate deploy` (não interativo) — evita migrations acidentais tipo "cadu".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"

if [ ! -f "$BACKEND/.env" ]; then
  if [ -f "$ROOT/.env" ]; then
    cp "$ROOT/.env" "$BACKEND/.env"
    echo "OK  backend/.env criado a partir da raiz"
  else
    echo "ERRO: falta .env na raiz ou em backend/"
    exit 1
  fi
fi

echo "==> Amarante migrate deploy (Prisma)"
cd "$BACKEND"
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
