import {
  REQUEST_STATE_COLORS,
  REQUEST_STATE_LABELS,
  requestDestinationColor,
  requestDestinationLabel,
  requestStateColor,
  stageTint,
} from './requestLabels';
import type { Notification } from './types';

/** Rótulos do tipo de notificação (enum Prisma). */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  GERAL: 'Caixa de entrada',
  DEVOLVIDA: 'Devolvida',
  APROVADA: 'Aprovada',
  ERRO_INTEGRACAO: 'Erro integração',
  SLA_VENCENDO: 'SLA vencendo',
};

/** Cores alinhadas às tags de etapa / destino do portal. */
export const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  DEVOLVIDA: REQUEST_STATE_COLORS.RETORNO_SOLICITANTE,
  APROVADA: REQUEST_STATE_COLORS.APROVADO,
  ERRO_INTEGRACAO: REQUEST_STATE_COLORS.ERRO_INTEGRACAO,
  SLA_VENCENDO: REQUEST_STATE_COLORS.SOLICITANTE,
  GERAL: REQUEST_STATE_COLORS.APROVADOR,
};

const TITLE_SEP = ' — ';

/** Separa título composto (`Solicitação 19 — Etapa`). */
export function parseNotificationTitle(title: string) {
  const idx = title.indexOf(TITLE_SEP);
  if (idx === -1) {
    return { headline: title, stageSuffix: null as string | null };
  }
  return {
    headline: title.slice(0, idx).trim(),
    stageSuffix: title.slice(idx + TITLE_SEP.length).trim(),
  };
}

/** Resolve `request.state` a partir da notificação (API ou sufixo do título). */
export function notificationStageState(n: Notification): string | null {
  if (n.request?.state) return n.request.state;
  const { stageSuffix } = parseNotificationTitle(n.title);
  if (!stageSuffix) return null;

  const byLabel = Object.entries(REQUEST_STATE_LABELS).find(
    ([, label]) => label === stageSuffix,
  );
  if (byLabel) return byLabel[0];

  if (stageSuffix === 'Devolvida') return 'RETORNO_SOLICITANTE';
  if (stageSuffix === 'Na sua caixa') return 'SOLICITANTE';
  if (stageSuffix === 'Aprovada') return 'APROVADO';
  return null;
}

/** Rótulo da etapa/destino para badge colorida. */
export function notificationStageLabel(n: Notification): string | null {
  if (n.request) return requestDestinationLabel(n.request);
  const { stageSuffix } = parseNotificationTitle(n.title);
  if (stageSuffix) return stageSuffix;
  const state = notificationStageState(n);
  return state ? REQUEST_STATE_LABELS[state] ?? state : null;
}

/** Cor da etapa/destino (mesma paleta da caixa e Solicitações). */
export function notificationStageColor(n: Notification): string {
  if (n.request) return requestDestinationColor(n.request);
  if (n.type === 'APROVADA') return NOTIFICATION_TYPE_COLORS.APROVADA;
  if (n.type === 'DEVOLVIDA') return NOTIFICATION_TYPE_COLORS.DEVOLVIDA;
  if (n.type === 'ERRO_INTEGRACAO') return NOTIFICATION_TYPE_COLORS.ERRO_INTEGRACAO;
  const state = notificationStageState(n);
  if (state) return requestStateColor(state);
  return NOTIFICATION_TYPE_COLORS.GERAL;
}

/** Rótulo do tipo quando distinto da etapa (ex.: SLA, erro). */
export function notificationTypeLabel(type: string) {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationTypeColor(type: string) {
  return NOTIFICATION_TYPE_COLORS[type] ?? REQUEST_STATE_COLORS.APROVADOR;
}

/** Exibe badge de tipo quando não duplica a etapa já visível no título. */
export function notificationShowsTypeBadge(n: Notification) {
  if (n.type === 'GERAL' || n.type === 'DEVOLVIDA' || n.type === 'APROVADA') {
    return false;
  }
  return true;
}

/** Estilo inline para pills (fundo tint + borda). */
export function coloredFlagStyle(color: string) {
  return {
    color,
    background: stageTint(color, 18),
    border: `1px solid ${color}`,
  } as const;
}
