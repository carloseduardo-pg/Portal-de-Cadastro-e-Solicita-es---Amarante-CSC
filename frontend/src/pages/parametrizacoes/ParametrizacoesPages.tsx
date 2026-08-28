import { useEffect, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { catalogApi } from '../../lib/resources';
import type {
  CatalogGroup,
  CatalogSubgroup,
  Family,
  HierarchyAnomaly,
} from '../../lib/types';
import '../produtos/produtos.css';

type PdmTab = 'families' | 'subgroups' | 'groups';
type AuxTab = 'hotels' | 'warehouses' | 'units';
type Tab = PdmTab | AuxTab;

type GenericRow = { id: string; code: string; name: string };

const PDM_TABS: { id: PdmTab; label: string }[] = [
  { id: 'families', label: 'Famílias' },
  { id: 'subgroups', label: 'Subgrupos' },
  { id: 'groups', label: 'Grupos' },
];

const AUX_TABS: { id: AuxTab; label: string }[] = [
  { id: 'hotels', label: 'Hotéis' },
  { id: 'warehouses', label: 'Armazéns' },
  { id: 'units', label: 'Unidade Medida' },
];

const ANOMALY_LABEL: Record<HierarchyAnomaly, string> = {
  quarantine: 'Quarentena',
  ambiguous: 'Hierarquia ambígua',
  itens_placeholder: 'Grupo "Itens"',
};

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

/**
 * Parametrizações — Produtos.
 * Abas PDM na ordem SAP: Famílias → Subgrupos → Grupos (amplo → específico).
 */
export function ParametrizacoesProdutosPage() {
  const [tab, setTab] = useState<Tab>('families');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemKindFilter, setItemKindFilter] = useState<'' | 'CONSUMPTION' | 'FIXED_ASSET'>('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [families, setFamilies] = useState<Family[]>([]);
  const [subgroups, setSubgroups] = useState<CatalogSubgroup[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [generic, setGeneric] = useState<GenericRow[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const kind = itemKindFilter || undefined;
    const pageSize = 500;

    async function load() {
      try {
        if (tab === 'families') {
          const r = await catalogApi.families({
            search: debouncedSearch || undefined,
            itemKind: kind,
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
            page: 1,
            pageSize,
          });
          if (cancelled) return;
          setGroups(r.data);
          setTotal(r.total);
        } else if (tab === 'hotels') {
          const h = await catalogApi.hotels();
          if (cancelled) return;
          setGeneric(h.map((x) => ({ id: x.id, code: x.code, name: x.name })));
          setTotal(h.length);
        } else if (tab === 'warehouses') {
          const r = await catalogApi.warehouses(1);
          if (cancelled) return;
          setGeneric(
            r.data.map((x) => ({
              id: x.id,
              code: x.code,
              name: x.hotel ? `${x.name} (${x.hotel.code})` : x.name,
            })),
          );
          setTotal(r.total);
        } else if (tab === 'units') {
          const r = await catalogApi.measureUnits(1);
          if (cancelled) return;
          setGeneric(r.data.map((x) => ({ id: x.id, code: x.code, name: x.name })));
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
  }, [tab, debouncedSearch, itemKindFilter]);

  const isPdm = tab === 'families' || tab === 'subgroups' || tab === 'groups';

  function switchTab(next: Tab) {
    setTab(next);
    setSearch('');
    setDebouncedSearch('');
  }

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                setItemKindFilter(e.target.value as '' | 'CONSUMPTION' | 'FIXED_ASSET')
              }
            >
              <option value="">Todos</option>
              <option value="CONSUMPTION">Consumo</option>
              <option value="FIXED_ASSET">Ativo fixo</option>
            </select>
          </label>
        ) : null}
        <p className="param-count" role="status">
          {loading ? 'Carregando…' : `${total} registro${total === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled
          title="Árvore vem do SAP. Cadastro manual no portal aguarda definição de política (risco de dessincronizar)."
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
          columns={[
            { key: 'name', header: 'Nome', render: (r) => r.name },
            { key: 'code', header: 'Código', render: (r) => r.code },
          ]}
        />
      ) : null}
    </section>
  );
}

export function ParametrizacoesAdminPage() {
  return (
    <section>
      <h1 className="module-title">PARAMETRIZAÇÕES — ADMINISTRATIVO</h1>
      <p className="info-banner">
        Usuários e perfis — CRUD padrão Prottus (referência prints administrativo).
      </p>
    </section>
  );
}
