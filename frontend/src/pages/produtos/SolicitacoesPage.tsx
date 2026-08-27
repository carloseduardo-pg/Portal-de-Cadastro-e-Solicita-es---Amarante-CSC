import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { HotelCodeBadges } from '../../components/HotelCodeBadges';
import { PaginationBar } from '../../components/PaginationBar';
import {
  RequestRegistryStageBlocks,
  type RegistryStageTab,
} from '../../components/requests/RequestRegistryStageBlocks';
import {
  formatRequestDate,
  REGISTRY_STAGE_FILTER_OPTIONS,
  requestMainStageLabel,
} from '../../lib/requestLabels';
import { requestsApi } from '../../lib/resources';
import type { QueueResult, Request } from '../../lib/types';
import { slaBadge } from '../../lib/types';
import './produtos.css';
import '../../components/HotelCodeBadges.css';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const REGISTRY_TABS: RegistryStageTab[] = ['solicitante', 'aprovador', 'encerrado'];

function parseStageTab(value: string | null): RegistryStageTab | '' {
  if (value && REGISTRY_TABS.includes(value as RegistryStageTab)) {
    return value as RegistryStageTab;
  }
  return '';
}

function hotelCodes(r: Request) {
  if (r.hotels?.length) return r.hotels.map((h) => h.hotel.code);
  return r.hotel?.code ? [r.hotel.code] : [];
}

function startDate(r: Request) {
  const open = r.stages?.find((s) => !s.finishedAt);
  return open?.startedAt ?? r.submittedAt ?? r.createdAt;
}

/** Atrasada = ≥ 2 dias na etapa atual (somente solicitações abertas). */
function isRegistryLate(r: Request) {
  if (['ENCERRADO', 'APROVADO', 'REPROVADO', 'EXPIRADA'].includes(r.state)) return false;
  const start = new Date(startDate(r)).getTime();
  return Number.isFinite(start) && Date.now() - start >= TWO_DAYS_MS;
}

/**
 * Solicitações — lista analítica paginada de todas as solicitações de produtos.
 * Blocos por etapa principal; subvariações no filtro de busca.
 */
export function SolicitacoesPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const flash = (location.state as { flash?: string } | null)?.flash;

  const [data, setData] = useState<QueueResult | null>(null);
  const [tab, setTab] = useState<RegistryStageTab | ''>(() =>
    parseStageTab(searchParams.get('tab')),
  );
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [itemsMode, setItemsMode] = useState<'' | 'single' | 'multi'>('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);

  async function load(p = page, nextTab = tab) {
    const result = await requestsApi.queue({
      search: search || undefined,
      bucket: nextTab || undefined,
      type: type || undefined,
      itemsMode: itemsMode || undefined,
      stage: stage || undefined,
      page: p,
    });
    setData(result);
    setPage(result.page);
  }

  useEffect(() => {
    void load(1, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega ao trocar bloco/etapa
  }, [tab, stage]);

  useEffect(() => {
    const fromUrl = parseStageTab(searchParams.get('tab'));
    if (fromUrl !== tab) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à URL externa
  }, [searchParams]);

  function handleStageTab(next: RegistryStageTab | '') {
    setTab(next);
    if (!next) {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  }

  return (
    <section>
      <h1 className="module-title">SOLICITAÇÕES</h1>
      {flash ? <p className="info-banner form-success">{flash}</p> : null}
      <p className="info-banner">
        Visão analítica de todas as solicitações de produtos — abertas e encerradas. Para trabalhar
        na fila do seu perfil, use a{' '}
        <Link to="/produtos/caixa-de-entrada">Caixa de Entrada</Link>.
      </p>

      <RequestRegistryStageBlocks
        tab={tab}
        summary={data?.summary}
        ariaLabel="Etapas da solicitação"
        onTabChange={handleStageTab}
      />

      <FilterBar
        onSubmit={(e) => {
          e.preventDefault();
          void load(1);
        }}
        onClear={() => {
          setSearch('');
          setType('');
          setItemsMode('');
          setStage('');
          void requestsApi.queue({ bucket: tab || undefined, page: 1 }).then((result) => {
            setData(result);
            setPage(result.page);
          });
        }}
      >
        <input
          placeholder="Descrição do produto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Tipo da solicitação"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tipo (todos)</option>
          <option value="INCLUSAO">Inclusão</option>
          <option value="ALTERACAO">Alteração</option>
          <option value="BLOQUEIO_PARCIAL">Bloqueio parcial</option>
          <option value="BLOQUEIO_TOTAL">Bloqueio total</option>
        </select>
        <select
          aria-label="Quantidade de itens"
          value={itemsMode}
          onChange={(e) => setItemsMode(e.target.value as '' | 'single' | 'multi')}
        >
          <option value="">Itens (todos)</option>
          <option value="single">Um produto</option>
          <option value="multi">Mais de um</option>
        </select>
        <select
          aria-label="Etapa ou destino"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {REGISTRY_STAGE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataTable
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'sla',
            header: 'SLA',
            render: (r: Request) => {
              const late = isRegistryLate(r);
              const b = slaBadge(late);
              return <span className={b.className}>{b.label}</span>;
            },
          },
          {
            key: 'desc',
            header: 'Descrição / Lote',
            render: (r) =>
              r.items.length > 1
                ? `${r.items.length} itens · ${r.family?.name ?? ''}`
                : r.items[0]?.descriptionShort ?? r.requestDescription ?? '—',
          },
          {
            key: 'hotel',
            header: 'Unidade / Hotel',
            render: (r) => <HotelCodeBadges codes={hotelCodes(r)} />,
          },
          {
            key: 'requester',
            header: 'Solicitante',
            render: (r) => r.requester?.name ?? '—',
          },
          {
            key: 'start',
            header: 'Data de início',
            render: (r) => formatRequestDate(startDate(r)),
          },
          {
            key: 'end',
            header: 'Data de finalização',
            render: (r) => formatRequestDate(r.closedAt),
          },
          {
            key: 'approver',
            header: 'Aprovador',
            render: (r) => r.approvedBy?.name ?? '—',
          },
          {
            key: 'state',
            header: 'Etapa / Destino',
            render: (r) => (
              <span className="inbox-stage-pill">{requestMainStageLabel(r.state)}</span>
            ),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (r) => (
              <Link to={`/produtos/solicitacao/${r.id}`} className="btn btn-outline">
                Abrir
              </Link>
            ),
          },
        ]}
      />

      {data ? (
        <PaginationBar
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={(p) => void load(p)}
        />
      ) : null}
    </section>
  );
}
