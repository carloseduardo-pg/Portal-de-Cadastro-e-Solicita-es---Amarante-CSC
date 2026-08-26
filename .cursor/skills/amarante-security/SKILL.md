---
name: amarante-security
description: >-
  Applies Portal Amarante/Prottus security standards (JWT httpOnly cookies, Helmet,
  throttler, ValidationPipe, audit anonymization, no localStorage tokens).
  Use when changing auth, cookies, CORS, rate limits, login UI, audit_log,
  secrets, or reviewing security.
---

# Amarante — segurança (não negociar)

| Controle | Fato |
|----------|------|
| Tokens | Cookies `access_token` / `refresh_token`, **httpOnly** |
| FE | `credentials: 'include'` — **nunca** localStorage |
| Secrets | `JWT_*` obrigatórios; `.env` gitignored |
| Helmet | `main.ts` |
| Rate limit | Global 300/min; login 10/min |
| DTO | ValidationPipe whitelist + forbidNonWhitelisted |
| CRUD | `JwtAuthGuard` global; `@Public()` só health/login/refresh/logout |
| Senha | bcrypt; login UI sem pré-preencher |
| Audit | `password_hash` omitido |

## Ao alterar auth

1. Ler `auth.controller.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `frontend/src/lib/api.ts`
2. Refresh via cookie; FE retenta em 401
3. Não devolver tokens no body JSON
4. Endpoint público só com `@Public()` + nota em `seguranca.md`

## Checklist

- [ ] Sem secret no git
- [ ] Sem token no localStorage
- [ ] Rotas de negócio autenticadas
- [ ] `node tests/load/run-node.mjs smoke`

## Doc

`docs/projeto/seguranca.md` · `docs/projeto/ARQUITETURA.md`
