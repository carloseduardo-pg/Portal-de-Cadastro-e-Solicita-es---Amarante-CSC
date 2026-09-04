import { Icon } from '../Icon';
import type { RequestViewer } from '../../lib/types';
import './RequestViewersFlag.css';

type Props = {
  viewers?: RequestViewer[];
  /** Omite o usuário atual na tela de detalhe (ele já sabe que está lá). */
  currentUserId?: string;
  compact?: boolean;
};

/** Texto da flag de presença (quem está com a solicitação aberta). */
export function viewersFlagLabel(
  viewers: RequestViewer[],
  currentUserId?: string,
): string | null {
  const others = currentUserId
    ? viewers.filter((v) => v.id !== currentUserId)
    : viewers;
  if (others.length === 0) return null;
  const names = others.map((v) => v.name);
  if (names.length === 1) {
    return `${names[0]} está visualizando`;
  }
  if (names.length === 2) {
    return `${names[0]} e ${names[1]} estão visualizando`;
  }
  return `${names[0]} e mais ${names.length - 1} estão visualizando`;
}

/**
 * Flag visual: outro usuário está com esta solicitação aberta.
 */
export function RequestViewersFlag({ viewers, currentUserId, compact }: Props) {
  const label = viewersFlagLabel(viewers ?? [], currentUserId);
  if (!label) return null;

  return (
    <span
      className={`request-viewers-flag${compact ? ' request-viewers-flag--compact' : ''}`}
      role="status"
      title={label}
    >
      <Icon name="eye" size={compact ? 13 : 16} />
      <span>{label}</span>
    </span>
  );
}
