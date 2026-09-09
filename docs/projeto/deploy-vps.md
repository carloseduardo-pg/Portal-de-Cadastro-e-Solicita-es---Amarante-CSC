# Deploy VPS — Portal Amarante CSC

Checklist para o time de infra. Leia **antes** de `npm run setup` / `npm run dev`.

## 1. Fonte da verdade do ambiente

| Arquivo | Papel |
|---------|--------|
| **`.env` (raiz)** | Fonte da verdade — edite só este |
| **`backend/.env`** | Espelho automático (Prisma + Nest). Scripts sincronizam a partir da raiz |

```bash
cp .env.example .env
# edite DATABASE_URL, JWT_*, CORS_ORIGIN, NODE_ENV
cp .env backend/.env   # ou deixe o setup/migrate sincronizar
```

**Nunca** aponte `DATABASE_URL` para o usuário `postgres` (superuser).  
Use o usuário da **aplicação** (ex.: o criado pelo setup, ou um role dedicado).

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | API + migrations + triggers (usuário da app) |
| `POSTGRES_ADMIN_URL` (opcional) | Só para o `setup.sh` **criar** role/DB |

## 2. Ordem na VPS

```bash
cd /var/www/html/.../Amarante-CSC   # ou path do clone
git checkout dev && git pull

cp .env.example .env
nano .env   # DATABASE_URL real + JWT fortes + CORS do domínio + NODE_ENV=production

npm run install:all
bash database/scripts/verify-env.sh   # falha cedo se senha/usuário errados
npm run setup                         # cria DB se preciso + migrate + seed (se RUN_SEED)
# Em produção de teste, se já tiver dados: npm run migrate  (sem seed)

# Conferir de novo
bash database/scripts/verify-env.sh
bash database/scripts/check.sh
```

### Subir (dev / teste)

```bash
# API + UI com Vite (só ambiente de teste)
npm run dev
```

### Subir (produção / homologação estável)

```bash
npm run build
# API:
cd backend && NODE_ENV=production npm run start:prod
# UI: servir frontend/dist no nginx (proxy /api → :3000)
```

## 3. Nginx (recomendado)

- Site HTTPS → arquivos estáticos de `frontend/dist`
- `location /api/` → `http://127.0.0.1:3000/api/`
- Com isso o frontend usa `VITE_API_URL=/api` (default) e cookies JWT funcionam no mesmo domínio

Exemplo mínimo:

```nginx
server {
  listen 443 ssl;
  server_name portal.exemplo.com;

  root /var/www/html/.../Amarante-CSC/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

`CORS_ORIGIN` no `.env` deve incluir a URL pública (ex.: `https://portal.exemplo.com`).

## 4. Erros comuns

| Sintoma | Causa | Ação |
|---------|--------|------|
| `credentials for postgres are not valid` | `DATABASE_URL` com user `postgres` e senha errada | Trocar para usuário da app; alinhar `.env` ↔ `backend/.env` |
| Tabelas em um banco, API em outro | `.env` raiz ≠ `backend/.env` | `cp .env backend/.env` e `verify-env.sh` |
| Setup cria `postgree` local | Default do `.env.example` não editado | Editar `DATABASE_URL` **antes** do setup |
| Frontend chama `localhost:3000` | Build antigo | Rebuild com default `/api` (a partir deste fix) |
| Cookie de login some em HTTPS | proxy sem `X-Forwarded-Proto` / trust proxy | Usar nginx como acima; API já tem `trust proxy` |

## 5. Validação rápida

```bash
bash database/scripts/verify-env.sh
curl -s http://127.0.0.1:3000/api/health
```

Login seed (só se `SEED_DEMO_USER_ON_BOOT=true` ou após `npm run setup` com seed):  
`admin@amarante.local` / `amarante123` — **desligar seed em produção real**.
