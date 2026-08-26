#!/usr/bin/env bash
# Só recarrega os exemplos (sem migrate)
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

echo "==> Amarante seed"
cd "$BACKEND"
npx prisma db seed
echo "OK  seed concluído"
