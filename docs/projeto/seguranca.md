# Segurança — Portal Amarante CSC

Referência Prottus aplicada ao protótipo Amarante. Metodologia: [`docs/prottus/metodologia.md`](../prottus/metodologia.md).

---

## Princípios

| Item | Implementação |
|------|---------------|
| Auth | JWT access + refresh em cookies **httpOnly** |
| Token no browser | Proibido em `localStorage` / `sessionStorage` |
| API | `JwtAuthGuard` + `CapabilitiesGuard`; `@Public()` em login, refresh, logout e health |
| Usuário inativo | Mesma mensagem que credencial inválida |
| Headers | Helmet (CSP relaxado em dev para Swagger) |
| Rate limit | `@nestjs/throttler` |
| Input | `ValidationPipe` whitelist + forbidNonWhitelisted |
| CORS | `credentials: true`; origin de `CORS_ORIGIN` |
| Audit | Triggers SQL → `audit_log` (campos sensíveis omitidos) |
| Secrets | `.env` gitignored; `env.validation.ts` no boot |

---

## Cookies

| Cookie | Uso |
|--------|-----|
| `access_token` | JWT curto (15m default) |
| `refresh_token` | Renovação (7d default) |

Refresh: `POST /api/auth/refresh` — frontend retenta uma vez em 401.

---

## Seed local

`SEED_DEMO_USER_ON_BOOT=true` cria `admin@amarante.local` — **apenas desenvolvimento**.  
`.env.example` vem com `false`. `npm run setup` semeia usuários locais; `npm run migrate` **não** semeia.  
`backend/prisma/seed.ts` não cria senhas conhecidas quando `NODE_ENV=production`.

Usuários CSC (senha seed `amarante123` — trocar fora do protótipo):

| E-mail | Papel |
|--------|-------|
| `amanda.cavalcante@amarantehoteis.com.br` | ADMIN |
| `beatriz.barros@amarantehoteis.com.br` | SOLICITANTE |
| `andresa.ferreira@amarantehoteis.com.br` | APROVADOR |
| `erika.fouchard@amarantehoteis.com.br` | APROVADOR_IMOBILIZADO |
| `admin@amarante.local` | ADMIN (lab) |

---

## Checklist alteração auth

- [ ] Cookies httpOnly mantidos
- [ ] Sem token exposto ao JS
- [ ] Rotas de negócio permanecem protegidas
- [ ] Audit não grava senha/hash

Skill agente: `.cursor/skills/amarante-security/SKILL.md`
