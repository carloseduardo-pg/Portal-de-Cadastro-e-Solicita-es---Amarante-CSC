# Stress tests — Portal Amarante API

Suite de carga contra a API NestJS (cookies JWT).

## Pré-requisitos

1. PostgreSQL database `amarante` (migrate + seed)
2. Backend em `http://localhost:3000/api` (`npm run dev` ou `npm run dev:api`)

## Perfis

| Comando | Uso |
|---------|-----|
| `npm run test:stress:smoke` | Validação rápida |
| `npm run test:stress` | Padrão (20 VU × 200 req) |
| `npm run test:stress:heavy` | Carga alta |
| `npm run test:stress:login` | Flood de login |
| `npm run test:stress:read` | Listagens autenticadas |
| `npm run test:stress:requests` | Leitura pesada (kanban, queue, dashboard) |
| `npm run test:stress:mixed` | Mix leitura + /auth/me |

## Cenários

1. **read-storm** — `GET` em requests/products/catalog/users/me
2. **read-heavy** — kanban, queue, dashboard, notifications
3. **mixed-workload** — leituras + `/auth/me`
4. **login-flood** — `POST /auth/login` (429 esperado)

## Variáveis

| Nome | Default |
|------|---------|
| `STRESS_BASE_URL` | `http://localhost:3000/api` |
| `STRESS_EMAIL` | `admin@amarante.local` |
| `STRESS_PASSWORD` | `amarante123` |
| `STRESS_SKIP_LOGIN_FLOOD` | `1` para pular flood após heavy |

```bash
cd backend && npm run dev
npm run test:stress:smoke
```
