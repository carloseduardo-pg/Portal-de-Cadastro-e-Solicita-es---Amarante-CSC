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
  ENCERRADO: 'Aprovado total',
  APROVADO: 'Aprovado total',
  REPROVADO: 'Reprovado',
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
const APPROVED_COLOR = '#094111';
const REJECTED_COLOR = '#DC2626';

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
  { value: 'ENCERRADA', label: 'Finalizadas (todas)' },
  { value: 'ENCERRADA_APROVADA', label: 'Aprovado' },
  { value: 'ENCERRADA_REPROVADA', label: 'Reprovado' },
  /** Rascunho legado (`RASCUNHO`) — novos salvamentos entram em Solicitante. */
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'EXPIRADA', label: 'Expirada' },
] as const;

/** Etapa principal do fluxo (blocos da tela Solicitações). */
export const REQUEST_MAIN_STAGE_LABELS: Record<string, string> = {
  solicitante: 'Solicitante',
  imobilizado: REQUEST_STATE_LABELS.IMOBILIZADO,
  aprovador: REQUEST_STATE_LABELS.APROVADOR,
  encerrado: 'Finalizadas',
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  INCLUSAO: 'Inclusão',
  ALTERACAO: 'Alteração',
  BLOQUEIO: 'Bloqueio',
  // Histórico anterior ao bloqueio unificado — mantidos só para exibir registros antigos.
  BLOQUEIO_PARCIAL: 'Bloqueio parcial',
  BLOQUEIO_TOTAL: 'Bloqueio total',
};

/** Solicitação de bloqueio (tipo unificado + histórico parcial/total). */
export function isBlockRequestType(type: string) {
  return (
    type === 'BLOQUEIO' ||
    type === 'BLOQUEIO_PARCIAL' ||
    type === 'BLOQUEIO_TOTAL'
  );
}

/** Solicitação exige produto existente na base. */
export function isExistingProductRequestType(type: string) {
  return type === 'ALTERACAO' || isBlockRequestType(type);
}

export function requestTypeLabel(type: string) {
  return REQUEST_TYPE_LABELS[type] ?? type;
}

/**
 * Escopo do bloqueio: ambos os canais = total, um só = parcial.
 * Tipos históricos não gravavam canal — total cobre os dois; parcial cai em requisição.
 */
export function blockScopeLabel(request: {
  type?: string;
  blockRequisition?: boolean;
  blockPurchase?: boolean;
}) {
  let requisition = Boolean(request.blockRequisition);
  let purchase = Boolean(request.blockPurchase);
  if (!requisition && !purchase) {
    if (request.type === 'BLOQUEIO_TOTAL') {
      requisition = true;
      purchase = true;
    } else if (request.type === 'BLOQUEIO_PARCIAL') {
      requisition = true;
    }
  }
  if (requisition && purchase) return 'Requisição e compras (total)';
  if (requisition) return 'Requisição (parcial)';
  if (purchase) return 'Compras (parcial)';
  return 'Escopo não definido';
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

const APPROVED_STATES = new Set(['ENCERRADO', 'APROVADO']);

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

/**
 * Outcome de aprovação parcial/total gravado na timeline (quando existir).
 */
export function requestApprovalOutcome(
  stages?: { stage: string; outcome?: string | null }[] | null,
): 'APPROVAL_TOTAL' | 'APPROVAL_PARTIAL' | null {
  if (!stages?.length) return null;
  for (const s of stages) {
    if (s.outcome === 'APPROVAL_PARTIAL') return 'APPROVAL_PARTIAL';
    if (s.outcome === 'APPROVAL_TOTAL') return 'APPROVAL_TOTAL';
  }
  return null;
}

/**
 * Rótulo da coluna Etapa/Destino — finalizadas viram Aprovado/Reprovado
 * (parcial/total no mesmo verde).
 */
export function requestDestinationLabel(request: {
  state: string;
  stages?: { stage: string; outcome?: string | null }[] | null;
}) {
  if (request.state === 'REPROVADO') return 'Reprovado';
  if (request.state === 'EXPIRADA') return 'Expirada';
  if (APPROVED_STATES.has(request.state)) {
    return requestApprovalOutcome(request.stages) === 'APPROVAL_PARTIAL'
      ? 'Aprovado parcial'
      : 'Aprovado total';
  }
  return requestMainStageLabel(request.state);
}

/** Cor da tag Etapa/Destino (aprovado verde, reprovado vermelho). */
export function requestDestinationColor(request: {
  state: string;
  stages?: { stage: string; outcome?: string | null }[] | null;
}) {
  if (request.state === 'REPROVADO' || request.state === 'EXPIRADA') {
    return REJECTED_COLOR;
  }
  if (APPROVED_STATES.has(request.state)) return APPROVED_COLOR;
  return requestStateColor(request.state);
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
