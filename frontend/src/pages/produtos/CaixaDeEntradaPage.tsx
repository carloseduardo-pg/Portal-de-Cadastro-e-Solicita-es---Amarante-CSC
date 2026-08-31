import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  groupRequestsByPriority,
  inboxColumnsForRole,
  INBOX_PRIORITY_COLUMNS,
  MultiFilter,
  RequestInboxCard,
  stageTint,
} from '../../components/requests/RequestStageViews';
import { catalogApi, requestsApi, usersApi } from '../../lib/resources';
import type { Family, Hotel, InboxBoardResult } from '../../lib/types';
import './produtos.css';

type ViewMode = 'board' | 'list';

const VIEW_STORAGE_KEY = 'amarante-caixa-view';

function toggleBucketSet(list: Set<string>, id: string) {
  const next = new Set(list);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Caixa de entrada — quadro por prioridade (Novas / Do dia / Atrasadas).
 * Badge de etapa nos cards distingue Solicitante, Aprovador - Imobilizado e
 * Aprovador - Administrativo (Admin vê todos).
 */
export function CaixaDeEntradaPage() {
  const { user } = useAuth();
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;

  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === 'board' ? 'board' : 'list';
  });
  const [hideEmpty, setHideEmpty] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [familyIds, setFamilyIds] = useState<string[]>([]);
  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [requesterIds, setRequesterIds] = useState<string[]>([]);
  const [board, setBoard] = useState<InboxBoardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [requesters, setRequesters] = useState<{ id: string; name: string }[]>([]);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(() => new Set());

  const effectiveRole = board?.role ?? user?.role;
  const stageColumns = useMemo(
    () => inboxColumnsForRole(effectiveRole, board?.inboxStages),
    [effectiveRole, board?.inboxStages],
  );
  const showStageBadge = stageColumns.length > 1 || effectiveRole === 'ADMIN';

  useEffect(() => {
    void Promise.all([
      catalogApi.families({ pageSize: 200 }).then((r) => setFamilies(r.data)),
      catalogApi.hotels().then(setHotels),
      usersApi.list({ pageSize: 100 }).then((r) => setRequesters(r.data.map((u) => ({ id: u.id, name: u.name })))),
    ]).catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
    if (view === 'list') {
      setExpandedBuckets(new Set());
    }
  }, [view]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void requestsApi
        .inbox({
          search: search || undefined,
          type: typeFilter || undefined,
          familyIds: familyIds.length ? familyIds : undefined,
          hotelIds: hotelIds.length ? hotelIds : undefined,
          requesterIds: requesterIds.length ? requesterIds : undefined,
        })
        .then(setBoard)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, familyIds, hotelIds, requesterIds]);

  const rows = board?.data ?? [];

  const grouped = useMemo(() => groupRequestsByPriority(rows), [rows]);

  const visibleColumns = useMemo(() => {
    if (!hideEmpty) return INBOX_PRIORITY_COLUMNS;
    return INBOX_PRIORITY_COLUMNS.filter((col) => (grouped.get(col.id)?.length ?? 0) > 0);
  }, [grouped, hideEmpty]);

  const activeFilters =
    familyIds.length + hotelIds.length + requesterIds.length + (typeFilter ? 1 : 0);

  useEffect(() => {
    if (view !== 'list') return;
    if (!(activeFilters > 0 || search.trim())) return;
    const withCards = INBOX_PRIORITY_COLUMNS.filter(
      (c) => (grouped.get(c.id)?.length ?? 0) > 0,
    ).map((c) => c.id);
    setExpandedBuckets(new Set(withCards));
  }, [view, grouped, activeFilters, search]);

  function clearFilters() {
    setFamilyIds([]);
    setHotelIds([]);
    setRequesterIds([]);
    setTypeFilter('');
    setSearch('');
    setExpandedBuckets(new Set());
  }

  const roleHint =
    effectiveRole === 'ADMIN'
      ? 'Perfil Admin: fila unificada com badge de etapa (Solicitante, Aprovador - Imobilizado, Aprovador - Administrativo).'
      : effectiveRole === 'APROVADOR_IMOBILIZADO'
        ? 'Perfil Aprovador - Imobilizado: toda solicitação nova chega aqui para triagem (ativo fixo ou uso e consumo).'
        : effectiveRole === 'APROVADOR'
          ? 'Perfil Aprovador - Administrativo: somente solicitações na sua etapa.'
          : 'Perfil Solicitante: somente solicitações na sua etapa.';

  return (
    <section className="solicitacoes-page">
      <div className="solicitacoes-header">
        <div>
          <h1 className="module-title">CAIXA DE ENTRADA</h1>
          <p className="info-banner solicitacoes-intro">
            {roleHint} Prioridade pelo tempo na etapa (Novas · Do dia · Atrasadas). Encerradas em{' '}
            <Link to="/produtos/solicitacoes">Solicitações</Link>.
          </p>
        </div>
        <div className="view-toggle" role="tablist" aria-label="Modo de visualização">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'board'}
            className={`view-toggle-btn ${view === 'board' ? 'active' : ''}`}
            onClick={() => setView('board')}
          >
            Quadro
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            Lista
          </button>
        </div>
      </div>

      {flash ? <p className="info-banner form-success">{flash}</p> : null}

      <div className="solicitacoes-filters">
        <label className="solicitacoes-search">
          <span>Buscar</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Descrição, família, hotel ou solicitante..."
          />
        </label>

        <label className="solicitacoes-type">
          <span className="filter-multi-label">Tipo</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="INCLUSAO">Inclusão</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="BLOQUEIO_PARCIAL">Bloqueio parcial</option>
            <option value="BLOQUEIO_TOTAL">Bloqueio total</option>
          </select>
        </label>

        <MultiFilter
          label="Família"
          options={families.map((f) => ({ id: f.id, label: `${f.code} — ${f.name}` }))}
          selected={familyIds}
          onChange={setFamilyIds}
        />
        <MultiFilter
          label="Hotel"
          options={hotels.map((h) => ({ id: h.id, label: `${h.code} — ${h.name}` }))}
          selected={hotelIds}
          onChange={setHotelIds}
        />
        <MultiFilter
          label="Solicitante"
          options={requesters.map((u) => ({ id: u.id, label: u.name }))}
          selected={requesterIds}
          onChange={setRequesterIds}
        />

        <label className="solicitacoes-mine">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
          Ocultar colunas vazias
        </label>

        {activeFilters > 0 ? (
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Limpar filtros
          </button>
        ) : null}

        <span className="solicitacoes-count">
          {loading ? 'Atualizando…' : `${rows.length} solicitação(ões) na fila`}
        </span>
      </div>

      {view === 'board' ? (
        hideEmpty && visibleColumns.length === 0 ? (
          <p className="kanban-empty kanban-empty--page">Nenhuma solicitação na sua caixa de entrada.</p>
        ) : (
          <div className="kanban-board kanban-board--priority">
            {(hideEmpty ? visibleColumns : INBOX_PRIORITY_COLUMNS).map((col) => {
              const cards = grouped.get(col.id) ?? [];
              return (
                <div key={col.id} className="kanban-column">
                  <header
                    className="kanban-column-header"
                    style={{ borderTopColor: col.color, background: stageTint(col.color, 8) }}
                    title={col.hint}
                  >
                    <span className="kanban-column-title" style={{ color: col.color }}>{col.label}</span>
                    <span className="kanban-column-count">{cards.length}</span>
                  </header>
                  <div className="kanban-column-body">
                    {cards.length === 0 ? (
                      <p className="kanban-empty">Nenhuma solicitação nesta prioridade.</p>
                    ) : (
                      cards.map((r) => (
                        <RequestInboxCard
                          key={r.id}
                          request={r}
                          stageColumns={stageColumns}
                          showStageBadge={showStageBadge}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="kanban-list">
          {(hideEmpty ? visibleColumns : INBOX_PRIORITY_COLUMNS).map((col) => {
            const cards = grouped.get(col.id) ?? [];
            const open = expandedBuckets.has(col.id);
            return (
              <section key={col.id} className="kanban-list-stage">
                <button
                  type="button"
                  className="kanban-list-stage-header"
                  style={{ borderLeftColor: col.color, background: stageTint(col.color, 7) }}
                  onClick={() => setExpandedBuckets((prev) => toggleBucketSet(prev, col.id))}
                  aria-expanded={open}
                  title={col.hint}
                >
                  <span className="kanban-list-stage-title" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-column-count">{cards.length}</span>
                  <span className="kanban-list-chevron">{open ? '▾' : '▸'}</span>
                </button>
                {open ? (
                  <div className="kanban-list-stage-body">
                    {cards.length === 0 ? (
                      <p className="kanban-empty">Nenhuma solicitação nesta prioridade.</p>
                    ) : (
                      cards.map((r) => (
                        <RequestInboxCard
                          key={r.id}
                          request={r}
                          stageColumns={stageColumns}
                          showStageBadge={showStageBadge}
                          compact
                        />
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
