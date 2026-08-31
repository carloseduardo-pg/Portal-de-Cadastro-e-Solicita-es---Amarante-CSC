/** Rótulos de etapa para UI (código Prisma permanece em enum). */
export const REQUEST_STATE_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  /** Etapa histórica de preenchimento — exibida como Rascunho (mesmo conceito). */
  FORMULARIO: 'Rascunho',
  SOLICITANTE: 'Solicitante',
  /**
   * Aprovação patrimonial (ativo fixo). Enum Prisma: `IMOBILIZADO`.
   * Sempre exibir completo — não usar só "Aprovador" ou só "Imobilizado".
   */
  IMOBILIZADO: 'Aprovador - Imobilizado',
  /**
   * Aprovação final de cadastro (grava na base). Enum Prisma: `APROVADOR`.
   * Sempre exibir completo — não usar só "Aprovador".
   */
  APROVADOR: 'Aprovador - Administrativo',
  COMPLIANCE: 'Compliance',
  ENCERRADO: 'Encerrada — Aprovada',
  APROVADO: 'Encerrada — Aprovada',
  REPROVADO: 'Encerrada — Reprovada',
  RETORNO_SOLICITANTE: 'Retorno solicitante',
  ERRO_INTEGRACAO: 'Erro integração',
  EXPIRADA: 'Expirada',
};

/**
 * Cores das tags de etapa (mesma paleta da caixa / blocos de Solicitações).
 * Usar em badges, timeline e KPIs — não inventar cor por tela.
 */
export const REQUEST_STATE_COLORS: Record<string, string> = {
  RASCUNHO: '#F8AB2B',
  FORMULARIO: '#F8AB2B',
  SOLICITANTE: '#F8AB2B',
  RETORNO_SOLICITANTE: '#D97706',
  IMOBILIZADO: '#B45309',
  APROVADOR: '#7E975B',
  COMPLIANCE: '#6366F1',
  ENCERRADO: '#094111',
  APROVADO: '#094111',
  REPROVADO: '#DC2626',
  EXPIRADA: '#DC2626',
  ERRO_INTEGRACAO: '#DC2626',
};

const DEFAULT_STAGE_COLOR = '#094111';

/** Cor da tag da etapa (hex). */
export function requestStateColor(state: string) {
  return REQUEST_STATE_COLORS[state] ?? DEFAULT_STAGE_COLOR;
}

/** Tinta clara da cor de etapa (fundo de card/badge). */
export function stageTint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, white)`;
}

/** Valores especiais do filtro de etapa em Solicitações. */
export const REGISTRY_STAGE_FILTER_OPTIONS = [
  { value: '', label: 'Etapa (todas)' },
  { value: 'SOLICITANTE', label: 'Solicitante' },
  { value: 'IMOBILIZADO', label: REQUEST_STATE_LABELS.IMOBILIZADO },
  { value: 'APROVADOR', label: REQUEST_STATE_LABELS.APROVADOR },
  { value: 'RETORNO_SOLICITANTE', label: 'Retorno solicitante' },
  { value: 'ENCERRADA', label: 'Encerrada (todas)' },
  { value: 'ENCERRADA_APROVADA', label: 'Encerrada — Aprovada' },
  { value: 'ENCERRADA_REPROVADA', label: 'Encerrada — Reprovada' },
  /** Rascunho legado (`RASCUNHO`) — novos salvamentos entram em Solicitante. */
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'EXPIRADA', label: 'Expirada' },
] as const;

/** Etapa principal do fluxo (blocos da tela Solicitações). */
export const REQUEST_MAIN_STAGE_LABELS: Record<string, string> = {
  solicitante: 'Solicitante',
  imobilizado: REQUEST_STATE_LABELS.IMOBILIZADO,
  aprovador: REQUEST_STATE_LABELS.APROVADOR,
  encerrado: 'Encerrado',
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  INCLUSAO: 'Inclusão',
  ALTERACAO: 'Alteração',
  BLOQUEIO_PARCIAL: 'Bloqueio parcial',
  BLOQUEIO_TOTAL: 'Bloqueio total',
};

/** Solicitação exige produto existente na base. */
export function isExistingProductRequestType(type: string) {
  return type === 'ALTERACAO' || type === 'BLOQUEIO_PARCIAL' || type === 'BLOQUEIO_TOTAL';
}

export function requestTypeLabel(type: string) {
  return REQUEST_TYPE_LABELS[type] ?? type;
}

const SOLICITANTE_STATES = new Set([
  'RASCUNHO',
  'FORMULARIO',
  'SOLICITANTE',
  'RETORNO_SOLICITANTE',
]);

const ENCERRADO_STATES = new Set([
  'ENCERRADO',
  'APROVADO',
  'REPROVADO',
  'EXPIRADA',
]);

/** Mapeia `request.state` para a etapa principal exibida na listagem. */
export function requestMainStageKey(state: string): keyof typeof REQUEST_MAIN_STAGE_LABELS | null {
  if (SOLICITANTE_STATES.has(state)) return 'solicitante';
  if (state === 'IMOBILIZADO') return 'imobilizado';
  if (state === 'APROVADOR') return 'aprovador';
  if (ENCERRADO_STATES.has(state)) return 'encerrado';
  return null;
}

/** Rótulo da etapa principal. */
export function requestMainStageLabel(state: string) {
  const key = requestMainStageKey(state);
  return key ? REQUEST_MAIN_STAGE_LABELS[key] : requestStateLabel(state);
}

/** Nome amigável da etapa da solicitação. */
export function requestStateLabel(state: string) {
  return REQUEST_STATE_LABELS[state] ?? state;
}

/** Formata data/hora pt-BR ou traço. */
export function formatRequestDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
