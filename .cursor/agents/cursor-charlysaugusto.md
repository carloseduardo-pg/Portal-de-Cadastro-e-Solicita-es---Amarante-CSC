# Cursor — Charly

Registro vivo das conversas com o agente neste projeto.

**Repositório:** Portal Amarante CSC  
**Última atualização:** 2026-09-04 (presença na caixa/detalhe)  
**Local:** `.cursor/agents/cursor-charlysaugusto.md`

---

## Estado atual do projeto (snapshot)

| Item | Valor |
|------|-------|
| Cliente | Amarante CSC |
| Stack | ver `docs/projeto/especificacoes.md` |
| Status | Setup local do PostgreSQL no Fedora |

---

## Histórico de sessões

### 2026-09-04 — Flag de presença na solicitação

**Objetivo:** quando um usuário abre o detalhe a partir da caixa, os demais veem quem está visualizando.

**Decisões:**
- Tabela efêmera `request_viewers` (sem audit — heartbeat alto).
- Sem WebSocket: `PUT/DELETE /requests/:id/presence` + poll da caixa a 12s; TTL 45s.
- Flag amarela (acento) no card da caixa e no detalhe (omite o próprio usuário no detalhe).

**Arquivos:** schema/migration `add_request_viewers`, `requests.service/controller`, `useRequestPresence`, `RequestViewersFlag`, caixa e detalhe.

---

### 2026-09-04 — Setup DB Fedora (peer)

**Objetivo:** destravar `npm run setup` em Postgres 18 recém-instalado.

**Decisões:**
- No Fedora o superuser `postgres` só autentica via peer (usuário OS). A role `postgree` e o DB `amarante` ainda não existiam; senha TCP `postgree` falha para ambos.
- `setup.sh` ganhou fallback `sudo -u postgres` (padrão Fedora) e alinha a senha admin local para as próximas execuções.

**Arquivos:** `database/scripts/setup.sh`, `README.md`

---

## Pendências abertas

- Instalar contrib e retomar setup: `sudo dnf install -y postgresql-contrib && npm run setup`
