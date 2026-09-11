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
import type {
  CatalogGroup,
  CatalogSubgroup,
  Family,
  Hotel,
  InboxBoardResult,
} from '../../lib/types';
import './produtos.css';

type ViewMode = 'board' | 'list';

const VIEW_STORAGE_KEY = 'amarante-caixa-view';
const EMPTY_REQUESTS: InboxBoardResult['data'] = [];

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
  const [subgroupIds, setSubgroupIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [requesterIds, setRequesterIds] = useState<string[]>([]);
  const [board, setBoard] = useState<InboxBoardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [requesters, setRequesters] = useState<{ id: string; name: string }[]>([]);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(() => new Set());

  const effectiveRole = board?.role ?? user?.role;
  const stageColumns = useMemo(
    () => inboxColumnsForRole(effectiveRole, board?.inboxStages),
    [effectiveRole, board?.inboxStages],
  );
  const showStageBadge = stageColumns.length > 1 || effectiveRole === 'ADMIN';

  const subgroupOptions = useMemo(() => {
    if (!familyIds.length) return subgroups;
    const allowed = new Set(familyIds);
    return subgroups.filter((sg) => allowed.has(sg.familyId ?? sg.family?.id ?? ''));
  }, [subgroups, familyIds]);

  const groupOptions = useMemo(() => {
    if (subgroupIds.length) {
      const allowed = new Set(subgroupIds);
      return groups.filter((g) => allowed.has(g.subgroupId ?? ''));
    }
    if (familyIds.length) {
      const sgAllowed = new Set(subgroupOptions.map((sg) => sg.id));
      return groups.filter((g) => sgAllowed.has(g.subgroupId ?? ''));
    }
    return groups;
  }, [groups, subgroupIds, familyIds, subgroupOptions]);

  useEffect(() => {
    void Promise.all([
      catalogApi.families({ pageSize: 200 }).then((r) => setFamilies(r.data)),
      catalogApi.subgroups({ pageSize: 500, status: 'active' }).then((r) => setSubgroups(r.data)),
      catalogApi.groups({ pageSize: 500, status: 'active' }).then((r) => setGroups(r.data)),
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
    const allowedSg = new Set(subgroupOptions.map((sg) => sg.id));
    setSubgroupIds((prev) => {
      const next = prev.filter((id) => allowedSg.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [subgroupOptions]);

  useEffect(() => {
    const allowedG = new Set(groupOptions.map((g) => g.id));
    setGroupIds((prev) => {
      const next = prev.filter((id) => allowedG.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [groupOptions]);

  useEffect(() => {
    const filters = {
      search: search || undefined,
      type: typeFilter || undefined,
      familyIds: familyIds.length ? familyIds : undefined,
      subgroupIds: subgroupIds.length ? subgroupIds : undefined,
      groupIds: groupIds.length ? groupIds : undefined,
      hotelIds: hotelIds.length ? hotelIds : undefined,
      requesterIds: requesterIds.length ? requesterIds : undefined,
    };

    function loadInbox(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      void requestsApi
        .inbox(filters)
        .then(setBoard)
        .catch(console.error)
        .finally(() => {
          if (showSpinner) setLoading(false);
        });
    }

    const timer = setTimeout(() => loadInbox(true), 300);
    const poll = window.setInterval(() => loadInbox(false), 12_000);
    return () => {
      clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [search, typeFilter, familyIds, subgroupIds, groupIds, hotelIds, requesterIds]);

  const rows = board?.data ?? EMPTY_REQUESTS;

  // Lista: mais recente no topo. Quadro segue FIFO (mais tempo parado primeiro).
  const grouped = useMemo(
    () => groupRequestsByPriority(rows, view === 'list' ? 'desc' : 'asc'),
    [rows, view],
  );

  const visibleColumns = useMemo(() => {
    if (!hideEmpty) return INBOX_PRIORITY_COLUMNS;
    return INBOX_PRIORITY_COLUMNS.filter((col) => (grouped.get(col.id)?.length ?? 0) > 0);
  }, [grouped, hideEmpty]);

  const activeFilters =
    familyIds.length +
    subgroupIds.length +
    groupIds.length +
    hotelIds.length +
    requesterIds.length +
    (typeFilter ? 1 : 0);

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
    setSubgroupIds([]);
    setGroupIds([]);
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
            {roleHint} Prioridade pelo tempo na etapa (Novas · Do dia · Atrasadas). Finalizadas em{' '}
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

      <div className="solicitacoes-filters solicitacoes-filters--inbox">
        <label className="solicitacoes-search">
          <span>Buscar</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, descrição, subgrupo, família, hotel…"
          />
        </label>

        <label className="solicitacoes-type">
          <span className="filter-multi-label">Tipo</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="INCLUSAO">Inclusão</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="BLOQUEIO">Bloqueio</option>
          </select>
        </label>

        <MultiFilter
          label="Família"
          options={families.map((f) => ({ id: f.id, label: `${f.code} — ${f.name}` }))}
          selected={familyIds}
          onChange={setFamilyIds}
        />
        <MultiFilter
          label="Subgrupo"
          options={subgroupOptions.map((sg) => ({
            id: sg.id,
            label: `${sg.code} — ${sg.name}`,
          }))}
          selected={subgroupIds}
          onChange={setSubgroupIds}
        />
        <MultiFilter
          label="Grupo de itens"
          options={groupOptions.map((g) => ({
            id: g.id,
            label: `${g.code} — ${g.name}`,
          }))}
          selected={groupIds}
          onChange={setGroupIds}
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
