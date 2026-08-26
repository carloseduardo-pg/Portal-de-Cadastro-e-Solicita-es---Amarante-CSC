#!/usr/bin/env bash
# Aplica migrations pendentes + seed de exemplos Amarante
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

echo "==> Amarante seed"
npx prisma db seed
echo "OK  exemplos carregados"
