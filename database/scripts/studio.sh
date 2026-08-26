#!/usr/bin/env bash
# Prisma Studio (usa backend/.env — sem pedir senha)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"

if [ ! -f "$BACKEND/.env" ]; then
  if [ -f "$ROOT/.env" ]; then
    cp "$ROOT/.env" "$BACKEND/.env"
  else
    echo "ERRO: falta .env"
    exit 1
  fi
fi

cd "$BACKEND"
echo "==> Prisma Studio — Ctrl+C para sair"
npx prisma studio
