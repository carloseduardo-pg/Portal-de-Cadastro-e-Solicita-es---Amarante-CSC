# Módulo — Auth / Login

## Objetivo

Autenticar usuários internos do CSC e unidades sem expor tokens ao JavaScript.

## Tela

- `/login` — duas colunas (imagem resort + formulário), logo Amarante, e-mail e senha.
- Sem credenciais pré-preenchidas.

## API (padrão Prottus — não reimplementar)

| Método | Endpoint |
|--------|----------|
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/refresh` |
| GET | `/api/auth/me` |

## Regras

- JWT access + refresh em cookies `httpOnly`.
- `JwtAuthGuard` global; rotas públicas só com `@Public()`.
- `CapabilitiesGuard` global; rotas de negócio com `@RequireCap(...)`.
- `/api/auth/me` (e login/refresh) devolvem `role` + `capabilities[]`.
- Usuário inativo não autentica.
- Frontend: `credentials: 'include'`; menu e rotas filtram por capacidade.

## Papéis (`UserRole`)

| Papel | Quem | Capacidades principais |
|-------|------|------------------------|
| `ADMIN` | CSC / Amanda Cavalcante | Todas |
| `SOLICITANTE` | Unidades / Beatriz Barros | Produtos + criar solicitação |
| `APROVADOR` | Administrativo / Andresa Ferreira | Fila administrativa + catálogo |
| `APROVADOR_IMOBILIZADO` | Imobilizado / Erika Fouchard | Fila imobilizado + catálogo |
| `COMPLIANCE` | Fornecedores (fase 2) | Módulo fornecedores |

Mapa: `backend/src/auth/capabilities.ts`. CRUD de usuário (`POST/PATCH/DELETE /api/users`) exige `users.manage`.

## Fora deste protótipo

- Autenticação do **fornecedor externo** (módulo Fiscal) — decisão em aberto; ver [`requisitos/requisito.md`](../requisitos/requisito.md).

## Referência visual

- `imagens/Imagens Semplice/Print0-Login.png` (layout, não qualidade visual)
