import { Link } from 'react-router-dom';
import type { Request } from '../../lib/types';
import { slaBadge } from '../../lib/types';

export type StageColumn = {
  state: string;
  label: string;
  color: string;
};

/** Colunas de prioridade na caixa de entrada (substituem agrupamento por etapa). */
export type InboxPriorityBucket = 'novas' | 'doDia' | 'atrasadas';

export const INBOX_PRIORITY_COLUMNS: {
  id: InboxPriorityBucket;
  label: string;
  color: string;
  hint: string;
}[] = [
  {
    id: 'novas',
    label: 'Novas',
    color: '#2563EB',
    hint: 'Entraram na etapa nas últimas 6 horas',
  },
  {
    id: 'doDia',
    label: 'Do dia',
    color: '#7E975B',
    hint: 'Entre 6 horas e 2 dias na etapa atual',
  },
  {
    id: 'atrasadas',
    label: 'Atrasadas',
    color: '#DC2626',
    hint: 'Há 2 dias ou mais na etapa sem destino',
  },
];

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Início da etapa aberta (ou envio/criação). */
export function openStageStartedAt(r: Request) {
  const open = r.stages?.find((s) => !s.finishedAt);
  return open?.startedAt ?? r.submittedAt ?? r.createdAt;
}

/** Bucket exclusivo: Atrasadas → Novas → Do dia. */
export function inboxPriorityBucket(r: Request): InboxPriorityBucket {
  const start = new Date(openStageStartedAt(r)).getTime();
  if (!Number.isFinite(start)) return 'doDia';
  const age = Date.now() - start;
  if (age >= TWO_DAYS_MS) return 'atrasadas';
  if (age < SIX_HOURS_MS) return 'novas';
  return 'doDia';
}

/** Agrupa solicitações da fila por coluna de prioridade (FIFO na etapa atual). */
export function groupRequestsByPriority(rows: Request[]) {
  const map = new Map<InboxPriorityBucket, Request[]>(
    INBOX_PRIORITY_COLUMNS.map((c) => [c.id, []]),
  );
  rows.forEach((r) => {
    map.get(inboxPriorityBucket(r))!.push(r);
  });
  for (const col of INBOX_PRIORITY_COLUMNS) {
    const list = map.get(col.id)!;
    list.sort(
      (a, b) =>
        new Date(openStageStartedAt(a)).getTime() - new Date(openStageStartedAt(b)).getTime(),
    );
  }
  return map;
}

/** Etapas ativas da caixa de entrada (badge nos cards). */
export const INBOX_STAGE_COLUMNS: StageColumn[] = [
  { state: 'SOLICITANTE', label: 'Solicitante', color: '#F8AB2B' },
  { state: 'APROVADOR', label: 'Aprovador', color: '#7E975B' },
  { state: 'COMPLIANCE', label: 'Compliance', color: '#0F766E' },
];

/** Colunas visíveis na caixa conforme perfil. */
export function inboxColumnsForRole(role?: string, inboxStages?: string[]) {
  const allowed = inboxStages?.length
    ? inboxStages
    : role === 'ADMIN'
      ? INBOX_STAGE_COLUMNS.map((c) => c.state)
      : role === 'APROVADOR'
        ? ['APROVADOR']
        : role === 'COMPLIANCE'
          ? ['COMPLIANCE']
          : ['SOLICITANTE'];
  return INBOX_STAGE_COLUMNS.filter((c) => allowed.includes(c.state));
}

/** Tinta cor de etapa como fundo leve. */
export function stageTint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, white)`;
}

export function requestTitle(r: Request) {
  const main = r.items[0]?.descriptionShort ?? 'Sem descrição';
  if (r.items.length > 1) return `${main} (+${r.items.length - 1})`;
  return main;
}

function typeLabel(type: string) {
  return type === 'ALTERACAO' ? 'Alteração' : 'Inclusão';
}

function formatStageDate(r: Request) {
  const d = openStageStartedAt(r);
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatStageTime(r: Request) {
  const d = openStageStartedAt(r);
  return new Date(d).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function columnByState(state: string, columns: StageColumn[]) {
  return columns.find((c) => c.state === state);
}

export function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const summary =
    selected.length === 0
      ? 'Todos'
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.label ?? '1 selecionado'
        : `${selected.length} selecionados`;

  return (
    <details className="filter-multi">
      <summary>
        <span className="filter-multi-label">{label}</span>
        <span className="filter-multi-value">{summary}</span>
      </summary>
      <div className="filter-multi-options">
        <button type="button" className="btn btn-ghost filter-multi-clear" onClick={() => onChange([])}>
          Limpar
        </button>
        {options.map((o) => (
          <label key={o.id} className="filter-multi-option">
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={() => onChange(toggleId(selected, o.id))}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

/** Card de solicitação na caixa de entrada (quadro ou lista por prioridade). */
export function RequestInboxCard({
  request: r,
  stageColumns,
  showStageBadge = true,
  compact,
}: {
  request: Request;
  /** Colunas de etapa para badge visual (Solicitante / Aprovador / Compliance). */
  stageColumns: StageColumn[];
  showStageBadge?: boolean;
  compact?: boolean;
}) {
  const late = r.stages?.[0]?.isLate;
  const badge = slaBadge(Boolean(late));
  const col = columnByState(r.state, stageColumns);

  return (
    <Link
      to={`/produtos/solicitacao/${r.id}`}
      className={`kanban-card ${compact ? 'kanban-card--list' : ''}`}
    >
      <div className="kanban-card-head">
        <strong>{requestTitle(r)}</strong>
        <span className="kanban-card-type">{typeLabel(r.type)}</span>
      </div>
      {showStageBadge && col ? (
        <span className="kanban-card-stage" style={{ borderColor: col.color, color: col.color }}>
          {col.label}
        </span>
      ) : null}
      <dl className="kanban-card-facts">
        <div>
          <dt>Família</dt>
          <dd>{r.family ? `${r.family.code} — ${r.family.name}` : '—'}</dd>
        </div>
        <div>
          <dt>Hotel</dt>
          <dd>
            {r.hotels?.length
              ? r.hotels.map((rh) => rh.hotel.code).join(', ')
              : r.hotel
                ? `${r.hotel.code} — ${r.hotel.name}`
                : '—'}
          </dd>
        </div>
        <div>
          <dt>Solicitante</dt>
          <dd>{r.requester?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Itens</dt>
          <dd>{r.items.length}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{formatStageDate(r)}</dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd>{formatStageTime(r)}</dd>
        </div>
        {r.expiresAt ? (
          <div>
            <dt>Expira</dt>
            <dd>{new Date(r.expiresAt).toLocaleDateString('pt-BR')}</dd>
          </div>
        ) : null}
      </dl>
      {r.stages?.length ? (
        <span className={`kanban-card-sla ${badge.className}`}>{badge.label}</span>
      ) : null}
    </Link>
  );
}
