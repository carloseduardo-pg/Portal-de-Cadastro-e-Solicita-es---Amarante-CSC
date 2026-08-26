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
- Usuário inativo não autentica.
- Frontend: `credentials: 'include'`.

## Fora deste protótipo

- Autenticação do **fornecedor externo** (módulo Fiscal) — decisão pendente Q11 PRD.

## Referência visual

- `imagens/Imagens Semplice/Print0-Login.png` (layout, não qualidade visual)
