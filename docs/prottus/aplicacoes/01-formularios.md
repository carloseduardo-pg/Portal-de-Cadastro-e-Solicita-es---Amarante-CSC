# Formulários — catálogo Prottus / Scriptcase

## 1. Quando usar

Cadastro, edição, exclusão lógica e fluxos de entrada de dados (CRUD e formulários de controle). Preferir formulário + consulta ligada; não criar tela “solta” sem listagem quando o módulo for gestão.

## 2. Variantes

### Tipos

| Variante Scriptcase | Finalidade | Checklist mínimo |
|---------------------|------------|------------------|
| Único registro | CRUD de um registro por tela | Campos obrigatórios; StatusToggle ATIVO/INATIVO se entidade tiver status; validação antes de salvar |
| Múltiplos registros | Edição de vários registros na mesma tela | Paginação; validação por linha; feedback do que faltou |
| Grid editável em linha | Edição rápida na própria grade | Colunas editáveis explícitas; salvar/cancelar claro |
| Grid editável (View) | Grade + visão de edição | Separar colunas de listagem vs. edição |
| Grid editável + form modal | Listagem com modal de formulário | Modal com `.form-field__required`; fechar sem salvar descarta |
| Formulário multi-etapas | Wizard / cadastro longo | Indicador de etapa; validar etapa antes de avançar; persistir rascunho se o projeto exigir |

### Layout

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Label fixo | Labels alinhados à esquerda/fix | Labels pequenos, cor secundária (DS Prottus) |
| Blocos em treeview | Agrupar campos em blocos recolhíveis | Títulos de bloco claros; não esconder obrigatórios sem indicação |
| Labels abaixo dos campos | Layout compacto | Manter altura de inputs do padrão do projeto |

### Campos

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Bloquear horários anteriores (data/hora) | Impedir datas passadas indevidas | Regra documentada na spec |
| Desativar autofill do navegador | Campos sensíveis / login | `autocomplete` adequado |
| Expressões regulares | Validação de formato | Mensagem de erro em português |
| Formatação automática | Máscaras (CPF, telefone, etc.) | Máscara alinhada ao domínio |
| Tooltips (Tippy.js / nativo) | Ajuda contextual | Sem emoji; texto curto |
| Validação de chave única | Evitar duplicidade | Erro 409 / mensagem clara |
| Assinatura digital | Captura de assinatura | Armazenamento e LGPD na spec |
| Autocomplete | Busca assistida | Lookup com FK explícita |
| Marca d'água | Placeholder | Não substitui label |
| Upload para nuvem | Arquivos remotos | Credenciais fora do Git |
| Upload múltiplas imagens | Galeria | Limites de tamanho/tipo |
| Editor HTML | Texto rico | Sanitização na saída |
| Combobox com edição | Lookup editável | Permissão de criar no lookup |
| Combobox multi-selecionável | Vários valores | **Relação N:N** — nunca CSV no campo principal |
| Relacionamento N:N (duplo select) | Associação muitos-para-muitos | Tabela de junção |
| Relacionamento N:N (checkbox) | Idem, UI checkbox | Tabela de junção |
| Avaliação (rating) | Nota / estrelas | Escala documentada |

### Links

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Mestre-detalhe | Pai + filhos na mesma operação | FK; ordem de gravação; exclusão em cascata ou bloqueio documentado |
| Mestre-detalhe com consulta | Pai + grid de filhos | Botão novo/editar no detalhe |
| Capturar informações da consulta | Preencher form a partir de grid | Campos capturados listados na spec |
| Consulta e formulário na mesma página | UX híbrida | Tema único; sem duplicar título de módulo |

### Botões e filtros

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| PDF e impressão | Saída impressa do form | Layout legível; marca do cliente |
| Agrupando botões | Toolbar organizada | Primário à direita quando for ação principal |
| Construtor de filtros / filtro dinâmico | Pesquisa no form | Defaults do `padrao-aplicacoes.md` |
| Ligação de captura no filtro | Filtro com lookup | Mesma regra de captura |

### Form de validação (controle)

| Variante | Finalidade | Checklist mínimo |
|----------|------------|------------------|
| Contato / registro | Forms sem tabela CRUD clássica | Validação + feedback; sem persistir secretos em log |
| Login responsivo (modelos 1–4) | Autenticação | Sem sidebar; logo do cliente; app de segurança do projeto |

## 3. Contrato Prottus

- Título da aplicação/módulo: **UPPERCASE bold**.
- Cores e tipografia via tema do projeto / tokens (`docs/projeto/design-system.md`).
- Zero emojis — ícones vetoriais.
- Campos obrigatórios: marcação visual + validação antes de salvar; listar o que falta.
- Status ativo/inativo: flag no registro; controle no **criar e editar**.
- Multi-select: relação/tabela de junção (nunca CSV no campo principal).
- Todo campo da listagem ligada deve existir no cadastro novo.
- Altura de botões/inputs: seguir densidade do `padrao-aplicacoes.md` (referência Prottus: 32px em UI web equivalente).

## 4. Herança do projeto

Obrigatório herdar de `docs/projeto/padrao-aplicacoes.md` + DS do cliente:

- Tema Scriptcase e tipografia
- Variante de formulário **default** do projeto
- Nomenclatura (`frm_…`)
- Comportamento de status, exports/PDF se aplicável
- App de login/segurança quando for form de controle

## 5. DoD da aplicação

- [ ] Variante escolhida no catálogo e registrada na spec `docs/projeto/aplicacoes/`
- [ ] Tema e tokens do projeto aplicados
- [ ] Ligações (consulta, mestre-detalhe, menu) configuradas
- [ ] Validação e N:N corretos
- [ ] Entrada no menu / hub do módulo
- [ ] `STATUS_PROTOTIPO.md` e sessão do agent atualizados
- [ ] Teste manual no Scriptcase (criar, editar, validar obrigatórios, N:N se houver)
