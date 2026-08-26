# Calendário — catálogo Prottus / Scriptcase

## 1. Quando usar

Agenda de eventos, alocação por data/hora, visão anual ou por usuário. Usar quando a dimensão temporal for o eixo principal da UX; para só listar datas em tabela, preferir Consulta.

## 2. Variantes

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Calendário anual em grade | Visão do ano | Navegação ano; legenda de cores |
| Calendário por usuário | Agenda individual | Filtro de usuário; permissão |
| Integração Google Calendar | Sync externo | Credenciais fora do Git; escopos OAuth documentados |
| Calendário responsivo | Desktop + mobile | Breakpoints testados; ações touch |

## 3. Contrato Prottus

- Cores de evento por **status/tipo** definidas no `padrao-aplicacoes.md` (não inventar por app).
- Fuso horário do projeto aplicado a criação/edição.
- Título UPPERCASE; tema do projeto; zero emojis.
- Criar/editar evento: campos obrigatórios + validação (início ≤ fim).
- Ligação a formulário de detalhe quando o evento tiver cadastro rico.

## 4. Herança do projeto

- Fuso horário
- Mapa status/tipo → cor
- Prefixo `cal_`
- Tema Scriptcase
- Integrações (Google etc.) só se listadas em `especificacoes.md`

## 5. DoD da aplicação

- [ ] Spec com entidade de evento, campos, cores, fuso
- [ ] CRUD de evento testado (criar, mover, excluir/cancelar)
- [ ] Menu atualizado
- [ ] STATUS + agent atualizados
