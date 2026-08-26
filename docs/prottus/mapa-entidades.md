# Mapa de entidades — abordagem Prottus

Documento **mestre** que define *como* documentar o domínio.  
O mapa preenchido do cliente atual fica em `docs/projeto/mapa-entidades.md`.

---

## Objetivo

Garantir que todo projeto Prottus tenha um mapa de entidades vivo, alinhado à descoberta DOP/FAROL e ao schema do banco.

---

## Seções obrigatórias no mapa do projeto

1. **Visão do domínio** — uma frase do negócio e entidades nucleares
2. **Áreas / schemas previstos** — agrupamento lógico (auth, domínio, apoio)
3. **Entidades principais** — tabelas com papel de cada uma
4. **Diagrama de relacionamento** — Mermaid `erDiagram` quando possível
5. **Fluxos operacionais** — passos do usuário principal
6. **Cardinalidades resumidas**
7. **Decisões em aberto**
8. **Alinhamento com telas** — tela ↔ entidades

---

## Convenções de modelagem

- Nomes de tabela/coluna em **inglês** (`snake_case`)
- Labels de UI em **português**
- Multi-seleção → tabela de junção (nunca CSV no campo principal)
- Status ativo → `active TINYINT(1)` no registro principal
- Soft rules de negócio documentadas nas decisões em aberto até fechamento com o cliente

---

## Template rápido (copiar para `docs/projeto/mapa-entidades.md`)

```markdown
# Mapa de entidades — {Cliente}

## 1. Visão do domínio
...

## 2. Áreas previstas
| Área | Responsabilidade | Exemplos |

## 3. Entidades principais
### 3.1 ...
| Entidade | Papel |

## 4. Diagrama
\`\`\`mermaid
erDiagram
\`\`\`

## 5. Fluxos operacionais
## 6. Cardinalidades
## 7. Decisões em aberto
## 8. Alinhamento com telas
```

---

## Ligação com o playbook

Após o mapa: modelar a persistência conforme `docs/projeto/especificacoes.md` e seguir `.cursor/rules/prottus/desenvolvimento-modulos.mdc`.
