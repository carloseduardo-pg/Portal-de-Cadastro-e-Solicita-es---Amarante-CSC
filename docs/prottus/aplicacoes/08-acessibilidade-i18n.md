# Acessibilidade e internacionalização — catálogo Prottus / Scriptcase

## 1. Quando usar

Dimensão **transversal**: aplica-se a todas as famílias. Não é uma “app” isolada na maioria dos casos; configura-se no projeto Scriptcase e reforça-se em cada spec. Use este documento ao definir `padrao-aplicacoes.md` e ao revisar DoD.

## 2. Variantes

### Acessibilidade

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Teclas de atalho | Navegação por teclado | Atalhos documentados; sem conflito com o browser |
| (Prottus) Contraste e foco | Legibilidade | Cores de marca com contraste adequado texto/fundo |
| (Prottus) Sem emoji na UI | Consistência e leitores de tela | Ícones vetoriais com sentido |
| (Prottus) Labels e obrigatórios | Formulários usáveis | Label visível; erro anuncia o que falta |

### Internacionalização

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Suporte a internacionalização | Textos/mensagens por locale | `pt-BR` obrigatório; outros locales listados no projeto |
| Formatos de data/número | Localidade | Fuso e formato do `padrao-aplicacoes.md` |
| Mensagens de validação | Feedback | Traduzidas nos locales ativos |

## 3. Contrato Prottus

- `pt-BR` sempre presente na UI de produto.
- Novos literais de interface passam pelo mecanismo de i18n do Scriptcase quando o projeto tiver mais de um locale.
- Atalhos e acessibilidade não quebram fluxos críticos (login, salvar, filtrar).
- Tema e tipografia permanecem os do projeto em todos os locales.

## 4. Herança do projeto

- Locales ativos
- Fuso e formatos
- Política de atalhos (se houver)
- Qualquer exigência legal de acessibilidade do cliente (em requisitos)

## 5. DoD (transversal)

Ao entregar qualquer app:

- [ ] Textos em português (e demais locales do projeto)
- [ ] Sem emoji na UI
- [ ] Obrigatórios e erros compreensíveis
- [ ] Datas/números no formato do projeto
- [ ] Desvios de a11y/i18n registrados na spec da app, se houver
