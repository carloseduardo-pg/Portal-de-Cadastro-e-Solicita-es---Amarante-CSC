import { useEffect, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { USER_ROLE_LABELS } from '../../lib/capabilities';
import { catalogApi, usersApi } from '../../lib/resources';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  Family,
  HierarchyAnomaly,
} from '../../lib/types';
import '../produtos/produtos.css';
import './parametrizacoes.css';

type PdmTab = 'families' | 'subgroups' | 'groups';
type AuxTab = 'hotels' | 'costCenters' | 'units';
type Tab = PdmTab | AuxTab;
type DialogMode = 'create' | 'edit';
type StatusFilter = 'active' | 'inactive' | 'all';
type ItemKindFilter = '' | 'CONSUMPTION' | 'FIXED_ASSET';

type GenericRow = { id: string; code: string; name: string; active?: boolean };

function statusBadge(active?: boolean) {
  const isActive = active !== false;
  return (
    <span className={isActive ? 'badge badge--success' : 'badge badge--danger'}>
      {isActive ? 'ATIVO' : 'INATIVO'}
    </span>
  );
}

const PDM_TABS: { id: PdmTab; label: string }[] = [
  { id: 'families', label: 'Famílias' },
  { id: 'subgroups', label: 'Subgrupos' },
  { id: 'groups', label: 'Grupos' },
];

const AUX_TABS: { id: AuxTab; label: string }[] = [
  { id: 'hotels', label: 'Hotéis' },
  { id: 'costCenters', label: 'Centros de custo' },
  { id: 'units', label: 'Unidade Medida' },
];

const ANOMALY_LABEL: Record<HierarchyAnomaly, string> = {
  quarantine: 'Quarentena',
  ambiguous: 'Hierarquia ambígua',
  itens_placeholder: 'Grupo "Itens"',
};

const STATUS_STORAGE_KEY = 'parametrizacoes-produtos:status-by-tab';
const TAB_STORAGE_KEY = 'parametrizacoes-produtos:tab';
const SEARCH_STORAGE_KEY = 'parametrizacoes-produtos:search-by-tab';
const KIND_STORAGE_KEY = 'parametrizacoes-produtos:item-kind-by-tab';

function isTab(value: string): value is Tab {
  return (
    value === 'families' ||
    value === 'subgroups' ||
    value === 'groups' ||
    value === 'hotels' ||
    value === 'costCenters' ||
    value === 'units'
  );
}

function loadInitialTab(): Tab {
  try {
    const raw = window.localStorage.getItem(TAB_STORAGE_KEY);
    return raw && isTab(raw) ? raw : 'families';
  } catch {
    return 'families';
  }
}

function loadStatusByTab(): Record<Tab, StatusFilter> {
  const fallback: Record<Tab, StatusFilter> = {
    families: 'active',
    subgroups: 'active',
    groups: 'active',
    hotels: 'active',
    costCenters: 'active',
    units: 'active',
  };
  try {
    const raw = window.localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<Tab, StatusFilter>>;
    return {
      families: parsed.families ?? 'active',
      subgroups: parsed.subgroups ?? 'active',
      groups: parsed.groups ?? 'active',
      hotels: parsed.hotels ?? 'active',
      costCenters: parsed.costCenters ?? 'active',
      units: parsed.units ?? 'active',
    };
  } catch {
    return fallback;
  }
}

function loadSearchByTab(): Record<Tab, string> {
  const fallback: Record<Tab, string> = {
    families: '',
    subgroups: '',
    groups: '',
    hotels: '',
    costCenters: '',
    units: '',
  };
  try {
    const raw = window.localStorage.getItem(SEARCH_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<Tab, string>>;
    return {
      families: parsed.families ?? '',
      subgroups: parsed.subgroups ?? '',
      groups: parsed.groups ?? '',
      hotels: parsed.hotels ?? '',
      costCenters: parsed.costCenters ?? '',
      units: parsed.units ?? '',
    };
  } catch {
    return fallback;
  }
}

function loadItemKindByTab(): Record<PdmTab, ItemKindFilter> {
  const fallback: Record<PdmTab, ItemKindFilter> = {
    families: '',
    subgroups: '',
    groups: '',
  };
  try {
    const raw = window.localStorage.getItem(KIND_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<PdmTab, ItemKindFilter>>;
    return {
      families: parsed.families ?? '',
      subgroups: parsed.subgroups ?? '',
      groups: parsed.groups ?? '',
    };
  } catch {
    return fallback;
  }
}

function itemKindLabel(kind?: string) {
  return kind === 'FIXED_ASSET' ? 'Ativo fixo' : 'Consumo';
}

function AnomalyBadges({ anomalies }: { anomalies?: HierarchyAnomaly[] }) {
  if (!anomalies?.length) return null;
  return (
    <span className="anomaly-badges">
      {anomalies.map((a) => (
        <span key={a} className={`anomaly-badge anomaly-badge--${a}`} title={ANOMALY_LABEL[a]}>
          {ANOMALY_LABEL[a]}
        </span>
      ))}
    </span>
  );
}

function dedupeCostCenters(rows: CostCenter[]) {
  const byCode = new Map<string, GenericRow>();
  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    if (!code) continue;
    if (!byCode.has(code)) {
      byCode.set(code, {
        id: row.id,
        code,
        name: row.name.trim().toUpperCase(),
        active: row.active !== false,
      });
    }
  }
  return [...byCode.values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || a.code.localeCompare(b.code),
  );
}

/**
 * Parametrizações — Produtos.
 * Abas PDM na ordem SAP: Famílias → Subgrupos → Grupos (amplo → específico).
 */
export function ParametrizacoesProdutosPage() {
  const [tab, setTab] = useState<Tab>(loadInitialTab);
  const [searchByTab, setSearchByTab] = useState<Record<Tab, string>>(loadSearchByTab);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemKindByTab, setItemKindByTab] = useState<Record<PdmTab, ItemKindFilter>>(loadItemKindByTab);
  const [statusByTab, setStatusByTab] = useState<Record<Tab, StatusFilter>>(loadStatusByTab);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [families, setFamilies] = useState<Family[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [generic, setGeneric] = useState<GenericRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editingCostCenterCode, setEditingCostCenterCode] = useState('');

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newKind, setNewKind] = useState<'CONSUMPTION' | 'FIXED_ASSET'>('CONSUMPTION');
  const [newFamilyId, setNewFamilyId] = useState('');
  const [newSubgroupId, setNewSubgroupId] = useState('');
  const [newCatalogGroupCode, setNewCatalogGroupCode] = useState('');

  const isPdm = tab === 'families' || tab === 'subgroups' || tab === 'groups';
  const currentSearch = searchByTab[tab] ?? '';
  const itemKindFilter: ItemKindFilter = isPdm ? itemKindByTab[tab as PdmTab] ?? '' : '';

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(currentSearch.trim()), 300);
    return () => window.clearTimeout(t);
  }, [currentSearch, tab]);

  useEffect(() => {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  }, [tab]);

  useEffect(() => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusByTab));
  }, [statusByTab]);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(searchByTab));
  }, [searchByTab]);

  useEffect(() => {
    window.localStorage.setItem(KIND_STORAGE_KEY, JSON.stringify(itemKindByTab));
  }, [itemKindByTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const kind = itemKindFilter || undefined;
    const status = statusByTab[tab];
    const pageSize = 500;

    async function load() {
      try {
        if (tab === 'families') {
          const r = await catalogApi.families({
            search: debouncedSearch || undefined,
            itemKind: kind,
            status,
            page: 1,
            pageSize,
          });
          if (cancelled) return;
          setFamilies(r.data);
          setTotal(r.total);
        } else if (tab === 'subgroups') {
          const r = await catalogApi.subgroups({
            search: debouncedSearch || undefined,
            itemKind: kind,
            status,
            page: 1,
            pageSize,
          });
          if (cancelled) return;
          setSubgroups(r.data);
          setTotal(r.total);
        } else if (tab === 'groups') {
          const r = await catalogApi.groups({
            search: debouncedSearch || undefined,
            itemKind: kind,
            status,
            page: 1,
            pageSize,
          });
          if (cancelled) return;
          setGroups(r.data);
          setTotal(r.total);
        } else if (tab === 'hotels') {
          const h = await catalogApi.hotels({ status });
          if (cancelled) return;
          setGeneric(h.map((x) => ({ id: x.id, code: x.code, name: x.name, active: x.active })));
          setTotal(h.length);
        } else if (tab === 'costCenters') {
          const r = await catalogApi.costCenters(undefined, { status });
          if (cancelled) return;
          const uniqueCenters = dedupeCostCenters(r);
          setGeneric(uniqueCenters);
          setTotal(uniqueCenters.length);
        } else if (tab === 'units') {
          const r = await catalogApi.measureUnits({ page: 1, pageSize: 500, status });
          if (cancelled) return;
          setGeneric(
            r.data.map((x) => ({ id: x.id, code: x.code, name: x.name, active: x.active })),
          );
          setTotal(r.total);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setFamilies([]);
          setSubgroups([]);
          setGroups([]);
          setGeneric([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, debouncedSearch, itemKindFilter, statusByTab, reloadKey]);

  const canCreate =
    tab === 'families' ||
    tab === 'subgroups' ||
    tab === 'groups' ||
    tab === 'costCenters' ||
    tab === 'hotels' ||
    tab === 'units';

  function switchTab(next: Tab) {
    setTab(next);
    setDialogOpen(false);
    setNewName('');
    setNewCode('');
    setNewKind('CONSUMPTION');
    setNewFamilyId('');
    setNewSubgroupId('');
    setNewCatalogGroupCode('');
    setDialogMode('create');
    setEditingId('');
    setEditingCostCenterCode('');
  }

  function setTabStatus(status: StatusFilter) {
    setStatusByTab((prev) => ({ ...prev, [tab]: status }));
  }

  function setTabSearch(value: string) {
    setSearchByTab((prev) => ({ ...prev, [tab]: value }));
  }

  function setTabItemKind(value: ItemKindFilter) {
    if (!isPdm) return;
    setItemKindByTab((prev) => ({ ...prev, [tab as PdmTab]: value }));
  }

  function openDialog() {
    setDialogMode('create');
    setDialogOpen(true);
    setNewName('');
    setNewCode('');
    setNewCatalogGroupCode('');
    setNewKind(itemKindFilter || 'CONSUMPTION');
    setNewFamilyId(families[0]?.id ?? '');
    setNewSubgroupId(subgroups[0]?.id ?? '');
    setEditingId('');
    setEditingCostCenterCode('');
  }

  function openEditFamily(row: Family) {
    setDialogMode('edit');
    setDialogOpen(true);
    setEditingId(row.id);
    setNewName(row.name);
    setNewCode(row.code);
    setNewKind((row.itemKind as 'CONSUMPTION' | 'FIXED_ASSET') ?? 'CONSUMPTION');
  }

  function openEditSubgroup(row: CatalogSubgroup) {
    setDialogMode('edit');
    setDialogOpen(true);
    setEditingId(row.id);
    setNewName(row.name);
    setNewCode(row.code);
    setNewFamilyId(row.familyId ?? row.family?.id ?? families[0]?.id ?? '');
  }

  function openEditGroup(row: CatalogGroup) {
    setDialogMode('edit');
    setDialogOpen(true);
    setEditingId(row.id);
    setNewName(row.name);
    setNewCode(row.code);
    setNewSubgroupId(row.subgroupId ?? row.subgroup?.id ?? subgroups[0]?.id ?? '');
    setNewCatalogGroupCode(row.catalogCode ?? '');
  }

  function openEditCostCenter(row: GenericRow) {
    setDialogMode('edit');
    setDialogOpen(true);
    setEditingCostCenterCode(row.code);
    setNewCode(row.code);
    setNewName(row.name);
  }

  function openEditGeneric(row: GenericRow) {
    setDialogMode('edit');
    setDialogOpen(true);
    setEditingId(row.id);
    setNewCode(row.code);
    setNewName(row.name);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (tab === 'families') {
        if (!newName.trim()) throw new Error('Informe o nome da família.');
        if (dialogMode === 'edit') {
          if (!editingId) throw new Error('Família inválida para edição.');
          await catalogApi.updateFamily(editingId, {
            name: newName.trim(),
            itemKind: newKind,
            code: newCode.trim() || undefined,
          });
        } else {
          await catalogApi.createFamily({
            name: newName.trim(),
            itemKind: newKind,
            code: newCode.trim() || undefined,
          });
        }
      } else if (tab === 'subgroups') {
        if (!newName.trim()) throw new Error('Informe o nome do subgrupo.');
        if (!newFamilyId) throw new Error('Selecione a família.');
        if (dialogMode === 'edit') {
          if (!editingId) throw new Error('Subgrupo inválido para edição.');
          await catalogApi.updateSubgroup(editingId, {
            familyId: newFamilyId,
            name: newName.trim(),
            code: newCode.trim() || undefined,
          });
        } else {
          await catalogApi.createSubgroup({
            familyId: newFamilyId,
            name: newName.trim(),
            code: newCode.trim() || undefined,
          });
        }
      } else if (tab === 'groups') {
        if (!newName.trim()) throw new Error('Informe o nome do grupo.');
        if (!newSubgroupId) throw new Error('Selecione o subgrupo.');
        if (!newCatalogGroupCode.trim()) throw new Error('Informe o código do grupo de itens.');
        if (dialogMode === 'edit') {
          if (!editingId) throw new Error('Grupo inválido para edição.');
          await catalogApi.updateGroup(editingId, {
            subgroupId: newSubgroupId,
            name: newName.trim(),
            catalogCode: newCatalogGroupCode.trim(),
            code: newCode.trim() || undefined,
          });
        } else {
          await catalogApi.createGroup({
            subgroupId: newSubgroupId,
            name: newName.trim(),
            catalogCode: newCatalogGroupCode.trim(),
            code: newCode.trim() || undefined,
          });
        }
      } else if (tab === 'costCenters') {
        if (!newName.trim()) throw new Error('Informe o nome do centro de custo.');
        if (!newCode.trim()) throw new Error('Informe o código do centro de custo.');
        if (dialogMode === 'edit') {
          if (!editingCostCenterCode) throw new Error('Centro de custo inválido para edição.');
          await catalogApi.updateCostCenter(editingCostCenterCode, {
            code: newCode.trim(),
            name: newName.trim(),
          });
        } else {
          await catalogApi.createCostCenter({
            code: newCode.trim(),
            name: newName.trim(),
          });
        }
      } else if (tab === 'hotels') {
        if (!newName.trim()) throw new Error('Informe o nome do hotel.');
        if (!newCode.trim()) throw new Error('Informe o código do hotel.');
        if (dialogMode === 'edit') {
          if (!editingId) throw new Error('Hotel inválido para edição.');
          await catalogApi.updateHotel(editingId, {
            code: newCode.trim(),
            name: newName.trim(),
          });
        } else {
          await catalogApi.createHotel({
            code: newCode.trim(),
            name: newName.trim(),
          });
        }
      } else if (tab === 'units') {
        if (!newName.trim()) throw new Error('Informe o nome da unidade de medida.');
        if (!newCode.trim()) throw new Error('Informe o código da unidade de medida.');
        if (dialogMode === 'edit') {
          if (!editingId) throw new Error('Unidade de medida inválida para edição.');
          await catalogApi.updateMeasureUnit(editingId, {
            code: newCode.trim(),
            name: newName.trim(),
          });
        } else {
          await catalogApi.createMeasureUnit({
            code: newCode.trim(),
            name: newName.trim(),
          });
        }
      }
      setDialogOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(row: Family | CatalogSubgroup | CatalogGroup | GenericRow) {
    if (!window.confirm('Confirma inativar este registro?')) return;
    try {
      if (tab === 'families') {
        await catalogApi.deactivateFamily((row as Family).id);
      } else if (tab === 'subgroups') {
        await catalogApi.deactivateSubgroup((row as CatalogSubgroup).id);
      } else if (tab === 'groups') {
        await catalogApi.deactivateGroup((row as CatalogGroup).id);
      } else if (tab === 'costCenters') {
        await catalogApi.deactivateCostCenter((row as GenericRow).code);
      } else if (tab === 'hotels') {
        await catalogApi.deactivateHotel((row as GenericRow).id);
      } else if (tab === 'units') {
        await catalogApi.deactivateMeasureUnit((row as GenericRow).id);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao inativar registro.');
    }
  }

  useEffect(() => {
    if (!dialogOpen) return;
    if (tab === 'subgroups' && !families.length) {
      void catalogApi
        .families({ page: 1, pageSize: 500, status: 'active' })
        .then((r) => setFamilies(r.data));
    }
    if (tab === 'groups' && !subgroups.length) {
      void catalogApi
        .subgroups({ page: 1, pageSize: 500, status: 'active' })
        .then((r) => setSubgroups(r.data));
    }
  }, [dialogOpen, tab, families.length, subgroups.length]);

  const baseDialogTitle =
    tab === 'families'
      ? 'família'
      : tab === 'subgroups'
        ? 'subgrupo'
        : tab === 'groups'
          ? 'grupo'
          : tab === 'hotels'
            ? 'hotel'
            : tab === 'units'
              ? 'unidade de medida'
              : 'centro de custo';
  const dialogTitle =
    dialogMode === 'edit'
      ? `Editar ${baseDialogTitle}`
      : `Cadastrar ${baseDialogTitle}`;
  const genericColumns = [
    { key: 'name', header: 'Nome', render: (r: GenericRow) => r.name },
    { key: 'code', header: 'Código', render: (r: GenericRow) => r.code },
    { key: 'status', header: 'Status', render: (r: GenericRow) => statusBadge(r.active) },
    {
      key: 'actions',
      header: 'Ações',
      render: (r: GenericRow) => (
        <div className="param-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => (tab === 'costCenters' ? openEditCostCenter(r) : openEditGeneric(r))}
          >
            Editar
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={r.active === false}
            onClick={() => void handleDeactivate(r)}
          >
            Inativar
          </button>
        </div>
      ),
    },
  ];

  return (
    <section>
      <h1 className="module-title">PARAMETRIZAÇÕES — PRODUTOS</h1>

      <div className="param-tabs" role="tablist" aria-label="Hierarquia PDM">
        {PDM_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`param-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="param-tabs-sep" aria-hidden />
        {AUX_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`param-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="param-toolbar">
        <label className="form-field param-search">
          <span className="param-search-label">Buscar</span>
          <input
            type="search"
            value={currentSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder={
              isPdm
                ? 'Buscar por nome ou código…'
                : 'Filtrar por nome ou código…'
            }
          />
        </label>
        {isPdm ? (
          <label className="form-field param-kind-filter">
            <span>Tipo de item</span>
            <select
              value={itemKindFilter}
              onChange={(e) =>
                setTabItemKind(e.target.value as ItemKindFilter)
              }
            >
              <option value="">Todos</option>
              <option value="CONSUMPTION">Consumo</option>
              <option value="FIXED_ASSET">Ativo fixo</option>
            </select>
          </label>
        ) : null}
        <label className="form-field param-kind-filter">
          <span>Status</span>
          <select
            value={statusByTab[tab]}
            onChange={(e) =>
              setTabStatus(e.target.value as StatusFilter)
            }
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <p className="param-count" role="status">
          {loading ? 'Carregando…' : `${total} registro${total === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canCreate || loading}
          onClick={openDialog}
        >
          Cadastrar
        </button>
      </div>

      {tab === 'families' ? (
        <DataTable
          rows={families}
          rowKey={(r) => r.id}
          emptyMessage={loading ? 'Carregando…' : 'Nenhuma família encontrada.'}
          columns={[
            {
              key: 'name',
              header: 'Nome',
              render: (r) => (
                <span className="param-name-cell">
                  <strong>{r.name}</strong>
                  <AnomalyBadges anomalies={r.anomalies} />
                </span>
              ),
            },
            {
              key: 'code',
              header: 'Código',
              render: (r) => r.code,
            },
            {
              key: 'kind',
              header: 'Tipo',
              render: (r) => (
                <span className={`kind-chip kind-chip--${r.itemKind ?? 'CONSUMPTION'}`}>
                  {itemKindLabel(r.itemKind)}
                </span>
              ),
            },
            {
              key: 'sub',
              header: 'Subgrupos',
              render: (r) => r.subgroupsCount ?? 0,
            },
            {
              key: 'items',
              header: 'Itens',
              render: (r) => r.productsCount ?? 0,
            },
            {
              key: 'attr',
              header: 'Atributos',
              render: (r) => r.attributesCount ?? 0,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => statusBadge(r.active),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (r) => (
                <div className="param-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEditFamily(r)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={r.active === false}
                    onClick={() => void handleDeactivate(r)}
                  >
                    Inativar
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {tab === 'subgroups' ? (
        <DataTable
          rows={subgroups}
          rowKey={(r) => r.id}
          emptyMessage={loading ? 'Carregando…' : 'Nenhum subgrupo encontrado.'}
          columns={[
            {
              key: 'name',
              header: 'Nome',
              render: (r) => (
                <span className="param-name-cell">
                  <strong>{r.name}</strong>
                  <AnomalyBadges anomalies={r.anomalies} />
                </span>
              ),
            },
            { key: 'code', header: 'Código', render: (r) => r.code },
            {
              key: 'kind',
              header: 'Tipo',
              render: (r) => (
                <span className={`kind-chip kind-chip--${r.itemKind ?? 'CONSUMPTION'}`}>
                  {itemKindLabel(r.itemKind)}
                </span>
              ),
            },
            {
              key: 'parent',
              header: 'Família',
              render: (r) =>
                r.family ? `${r.family.code} — ${r.family.name}` : '—',
            },
            {
              key: 'groups',
              header: 'Grupos',
              render: (r) => r.groupsCount ?? 0,
            },
            {
              key: 'items',
              header: 'Itens',
              render: (r) => r.productsCount ?? 0,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => statusBadge(r.active),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (r) => (
                <div className="param-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEditSubgroup(r)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={r.active === false}
                    onClick={() => void handleDeactivate(r)}
                  >
                    Inativar
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {tab === 'groups' ? (
        <DataTable
          rows={groups}
          rowKey={(r) => r.id}
          emptyMessage={loading ? 'Carregando…' : 'Nenhum grupo encontrado.'}
          columns={[
            {
              key: 'name',
              header: 'Nome',
              render: (r) => (
                <span className="param-name-cell">
                  <strong>{r.name}</strong>
                  <AnomalyBadges anomalies={r.anomalies} />
                </span>
              ),
            },
            { key: 'code', header: 'Código', render: (r) => r.catalogCode ?? r.code },
            {
              key: 'kind',
              header: 'Tipo',
              render: (r) => (
                <span className={`kind-chip kind-chip--${r.itemKind ?? 'CONSUMPTION'}`}>
                  {itemKindLabel(r.itemKind)}
                </span>
              ),
            },
            {
              key: 'family',
              header: 'Família',
              render: (r) =>
                r.family ? `${r.family.code} — ${r.family.name}` : '—',
            },
            {
              key: 'subgroup',
              header: 'Subgrupo',
              render: (r) =>
                r.subgroup ? `${r.subgroup.code} — ${r.subgroup.name}` : '—',
            },
            {
              key: 'items',
              header: 'Itens',
              render: (r) => r.productsCount ?? 0,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => statusBadge(r.active),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (r) => (
                <div className="param-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEditGroup(r)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={r.active === false}
                    onClick={() => void handleDeactivate(r)}
                  >
                    Inativar
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {!isPdm ? (
        <DataTable
          rows={
            debouncedSearch
              ? generic.filter((r) => {
                  const q = debouncedSearch.toUpperCase();
                  return (
                    r.name.toUpperCase().includes(q) ||
                    r.code.toUpperCase().includes(q)
                  );
                })
              : generic
          }
          rowKey={(r) => r.id}
          emptyMessage={loading ? 'Carregando…' : 'Nenhum registro encontrado.'}
          columns={genericColumns}
        />
      ) : null}

      <Modal
        open={dialogOpen}
        title={dialogTitle}
        onClose={saving ? () => undefined : () => setDialogOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? 'Salvando…' : dialogMode === 'edit' ? 'Salvar' : 'Cadastrar'}
            </button>
          </>
        }
      >
        {(tab === 'families' ||
          tab === 'subgroups' ||
          tab === 'groups' ||
          tab === 'costCenters' ||
          tab === 'hotels' ||
          tab === 'units') && (
          <div className="param-create-dialog">
            {(tab === 'families' || tab === 'subgroups' || tab === 'groups') && (
              <label className="form-field">
                <span>Nome</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
            )}

            {tab === 'families' ? (
              <>
                <label className="form-field">
                  <span>Tipo de item</span>
                  <select value={newKind} onChange={(e) => setNewKind(e.target.value as 'CONSUMPTION' | 'FIXED_ASSET')}>
                    <option value="CONSUMPTION">Consumo</option>
                    <option value="FIXED_ASSET">Ativo fixo</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Código interno (opcional)</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex.: MANF001"
                  />
                </label>
              </>
            ) : null}

            {tab === 'subgroups' ? (
              <>
                <label className="form-field">
                  <span>Família</span>
                  <select value={newFamilyId} onChange={(e) => setNewFamilyId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} — {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Código interno (opcional)</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex.: MANS001"
                  />
                </label>
              </>
            ) : null}

            {tab === 'groups' ? (
              <>
                <label className="form-field">
                  <span>Subgrupo</span>
                  <select value={newSubgroupId} onChange={(e) => setNewSubgroupId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {subgroups.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.family ? `${s.family.code} — ${s.family.name} · ` : '') + `${s.code} — ${s.name}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Código do grupo de itens (base real)</span>
                  <input
                    value={newCatalogGroupCode}
                    onChange={(e) => setNewCatalogGroupCode(e.target.value)}
                    placeholder="Ex.: 205"
                  />
                </label>
                <label className="form-field">
                  <span>Código interno (opcional)</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex.: MANG001"
                  />
                </label>
              </>
            ) : null}

            {tab === 'costCenters' ? (
              <>
                <label className="form-field">
                  <span>Código do centro de custo</span>
                  <input value={newCode} onChange={(e) => setNewCode(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Nome do centro de custo</span>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </label>
                <p className="derived-field">
                  O cadastro é aplicado automaticamente para todos os hotéis ativos.
                </p>
              </>
            ) : null}

            {tab === 'hotels' ? (
              <>
                <label className="form-field">
                  <span>Código do hotel</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex.: MCZ"
                    maxLength={10}
                  />
                </label>
                <label className="form-field">
                  <span>Nome do hotel</span>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </label>
              </>
            ) : null}

            {tab === 'units' ? (
              <>
                <label className="form-field">
                  <span>Código da unidade de medida</span>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ex.: UN"
                    maxLength={16}
                  />
                </label>
                <label className="form-field">
                  <span>Nome da unidade de medida</span>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </label>
              </>
            ) : null}
          </div>
        )}
      </Modal>
    </section>
  );
}

export function ParametrizacoesAdminPage() {
  const [users, setUsers] = useState<
    { id: string; name: string; email: string; role?: string; active: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .list({ pageSize: 100 })
      .then((r) => {
        if (!cancelled) setUsers(r.data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <h1 className="module-title">PARAMETRIZAÇÕES — ADMINISTRATIVO</h1>
      <p className="info-banner">
        Usuários internos e papéis. Só o administrador altera cadastro (API `users.manage`).
      </p>
      {error ? <p className="form-field-error">{error}</p> : null}
      {loading ? (
        <p className="param-count">Carregando…</p>
      ) : (
        <DataTable
          rows={users}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum usuário cadastrado."
          columns={[
            { key: 'name', header: 'Nome', render: (row) => row.name },
            { key: 'email', header: 'E-mail', render: (row) => row.email },
            {
              key: 'role',
              header: 'Papel',
              render: (row) =>
                USER_ROLE_LABELS[row.role as keyof typeof USER_ROLE_LABELS] ??
                row.role ??
                '—',
            },
            {
              key: 'active',
              header: 'Status',
              render: (row) => (row.active ? 'Ativo' : 'Inativo'),
            },
          ]}
        />
      )}
    </section>
  );
}
