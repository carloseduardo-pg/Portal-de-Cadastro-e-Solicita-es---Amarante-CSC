import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { HotelCodeBadges } from '../../components/HotelCodeBadges';
import { PaginationBar } from '../../components/PaginationBar';
import { SearchableSelect } from '../../components/SearchableSelect';
import { catalogApi, productsApi } from '../../lib/resources';
import { formatNcmDisplay } from '../../lib/ncm';
import type { Family, Hotel, ProductBase } from '../../lib/types';
import './produtos.css';

type StatusFilter = 'active' | 'inactive' | 'all';
type BaseKindTab = 'CONSUMPTION' | 'FIXED_ASSET';

/** Base de produtos — abas separadas Uso e consumo × Ativo fixo (catálogos distintos). */
export function BasePage() {
  const [kindTab, setKindTab] = useState<BaseKindTab>('CONSUMPTION');
  const [rows, setRows] = useState<ProductBase[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [hotel, setHotel] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [duplicatePairs, setDuplicatePairs] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const familyOptions = useMemo(
    () =>
      [...families]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
            a.code.localeCompare(b.code),
        )
        .map((f) => ({
          id: f.id,
          label: `${f.code} — ${f.name}`,
          searchText: `${f.code} ${f.name}`,
        })),
    [families],
  );

  useEffect(() => {
    void catalogApi.hotels().then(setHotels);
  }, []);

  useEffect(() => {
    setFamilyId('');
    void catalogApi
      .families({ pageSize: 500, itemKind: kindTab })
      .then((r) => setFamilies(r.data))
      .catch(console.error);
  }, [kindTab]);

  async function load(p = page) {
    setLoading(true);
    try {
      const activeParam = status === 'all' ? 'all' : status === 'inactive' ? 'false' : undefined;
      const r = await productsApi.base({
        search: search || undefined,
        hotel: hotel || undefined,
        active: activeParam,
        familyId: familyId || undefined,
        itemKind: kindTab,
        page: p,
        pageSize,
      });
      setRows(r.data);
      setTotal(r.total);
      setPage(r.page);
      setDuplicatePairs(r.duplicateSummary?.pairCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, hotel, familyId, status, kindTab]);

  const isAf = kindTab === 'FIXED_ASSET';

  return (
    <section>
      <h1 className="module-title">BASE DE PRODUTOS</h1>

      <div className="param-tabs" role="tablist" aria-label="Tipo de base">
        <button
          type="button"
          role="tab"
          aria-selected={!isAf}
          className={`param-tab ${!isAf ? 'active' : ''}`}
          onClick={() => setKindTab('CONSUMPTION')}
        >
          Uso e consumo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isAf}
          className={`param-tab ${isAf ? 'active' : ''}`}
          onClick={() => setKindTab('FIXED_ASSET')}
        >
          Ativo fixo
        </button>
      </div>

      <p className="info-banner">
        {isAf
          ? 'Base patrimonial (ativo fixo) — catálogo e fluxo distintos do uso e consumo. Filtre por status, unidade, família ou descrição.'
          : 'Base de uso e consumo — catálogo e fluxo distintos do ativo fixo. Filtre por status, unidade, família ou descrição.'}
      </p>

      {duplicatePairs > 0 && status !== 'inactive' && !isAf ? (
        <div className="duplicate-summary">
          <strong>{duplicatePairs} produtos com descrição idêntica na base</strong>
          <button type="button" className="btn btn-outline" onClick={() => setSearch('camisa')}>
            Revisar
          </button>
        </div>
      ) : null}

      <div className="base-filters">
        <label className="base-filter-field">
          <span>Buscar</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código, descrição, NCM..."
          />
        </label>
        <label className="base-filter-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <div className="base-filter-field">
          <SearchableSelect
            label="Família"
            options={familyOptions}
            value={familyId}
            onChange={setFamilyId}
            placeholder="Digite código ou nome da família…"
            emptyLabel="Todas"
          />
        </div>
        {loading ? <span className="base-filter-hint">Atualizando…</span> : null}
      </div>

      <div className="queue-tabs">
        <button
          type="button"
          className={`queue-tab ${!hotel ? 'active' : ''}`}
          onClick={() => setHotel('')}
        >
          Todos hotéis
        </button>
        {hotels.map((h) => (
          <button
            key={h.id}
            type="button"
            className={`queue-tab ${hotel === h.code ? 'active' : ''}`}
            onClick={() => setHotel(h.code)}
          >
            {h.code}
          </button>
        ))}
      </div>

      <p className="param-count" role="status">
        {loading ? 'Carregando…' : `${total} registro${total === 1 ? '' : 's'}`}
      </p>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={loading ? 'Carregando…' : 'Nenhum produto nesta base.'}
        columns={[
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <span className={r.active ? 'badge badge--success' : 'badge badge--danger'}>
                {r.active ? 'ATIVO' : 'INATIVO'}
              </span>
            ),
          },
          { key: 'code', header: 'Código', render: (r) => r.legacyCode ?? r.unifiedCode ?? '—' },
          { key: 'sap', header: 'Código SAP', render: (r) => r.sapCode ?? '—' },
          {
            key: 'desc',
            header: 'Descrição',
            render: (r) => (
              <span>
                {r.descriptionShort}
                {r.possibleDuplicate ? (
                  <span
                    className="duplicate-badge"
                    title={r.similarTo ? `Parecido com ${r.similarTo}` : 'Possível duplicata'}
                  >
                    possível duplicata
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: 'hotels',
            header: 'Unidades',
            render: (r) => (
              <HotelCodeBadges
                codes={r.hotelCodes ?? r.hotels?.map((ph) => ph.hotel.code) ?? []}
              />
            ),
          },
          { key: 'family', header: 'Família', render: (r) => r.family?.name ?? '—' },
          { key: 'ncm', header: 'NCM', render: (r) => formatNcmDisplay(r.ncmCode) || '—' },
          {
            key: 'unit',
            header: 'Unidade',
            render: (r) => (isAf ? '—' : r.measureUnit?.code ?? '—'),
          },
        ]}
      />
      <PaginationBar page={page} pageSize={pageSize} total={total} onChange={(p) => void load(p)} />
    </section>
  );
}
