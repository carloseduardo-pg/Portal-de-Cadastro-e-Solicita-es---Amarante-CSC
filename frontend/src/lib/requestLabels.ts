/** Rótulos de etapa para UI (código Prisma permanece em enum). */
export const REQUEST_STATE_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  /** Etapa histórica de preenchimento — exibida como Rascunho (mesmo conceito). */
  FORMULARIO: 'Rascunho',
  SOLICITANTE: 'Solicitante',
  APROVADOR: 'Aprovador',
  COMPLIANCE: 'Compliance',
  ENCERRADO: 'Encerrada — Aprovada',
  APROVADO: 'Encerrada — Aprovada',
  REPROVADO: 'Encerrada — Reprovada',
  RETORNO_SOLICITANTE: 'Retorno solicitante',
  ERRO_INTEGRACAO: 'Erro integração',
  EXPIRADA: 'Expirada',
};

/** Valores especiais do filtro de etapa em Solicitações. */
export const REGISTRY_STAGE_FILTER_OPTIONS = [
  { value: '', label: 'Etapa (todas)' },
  { value: 'SOLICITANTE', label: 'Solicitante' },
  { value: 'APROVADOR', label: 'Aprovador' },
  { value: 'RETORNO_SOLICITANTE', label: 'Retorno solicitante' },
  { value: 'ENCERRADA', label: 'Encerrada (todas)' },
  { value: 'ENCERRADA_APROVADA', label: 'Encerrada — Aprovada' },
  { value: 'ENCERRADA_REPROVADA', label: 'Encerrada — Reprovada' },
  /** Rascunho legado (`RASCUNHO`) — novos salvamentos entram em Solicitante. */
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'EXPIRADA', label: 'Expirada' },
] as const;

/** Etapa principal do fluxo (4 blocos da tela Solicitações). */
export const REQUEST_MAIN_STAGE_LABELS: Record<string, string> = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
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
  if (state === 'APROVADOR') return 'aprovador';
  if (ENCERRADO_STATES.has(state)) return 'encerrado';
  return null;
}

/** Rótulo da etapa principal (Solicitante / Aprovador / Compliance / Encerrado). */
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
