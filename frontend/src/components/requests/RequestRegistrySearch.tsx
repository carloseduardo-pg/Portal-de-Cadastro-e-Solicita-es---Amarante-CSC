import type { Family, Hotel } from '../../lib/types';
import { REGISTRY_STAGE_FILTER_OPTIONS } from '../../lib/requestLabels';
import { MultiFilter } from './RequestStageViews';

/** Estado dos filtros da busca avançada em Solicitações. */
export type RegistrySearchFilters = {
  search: string;
  type: string;
  itemsMode: '' | 'single' | 'multi';
  stage: string;
  familyIds: string[];
  hotelIds: string[];
  requesterIds: string[];
  operatorIds: string[];
  operatorStage: string;
  sla: '' | 'late' | 'on_time';
  submittedFrom: string;
  submittedTo: string;
  closedFrom: string;
  closedTo: string;
  mineOnly: boolean;
};

export const EMPTY_REGISTRY_FILTERS: RegistrySearchFilters = {
  search: '',
  type: '',
  itemsMode: '',
  stage: '',
  familyIds: [],
  hotelIds: [],
  requesterIds: [],
  operatorIds: [],
  operatorStage: '',
  sla: '',
  submittedFrom: '',
  submittedTo: '',
  closedFrom: '',
  closedTo: '',
  mineOnly: false,
};

const OPERATOR_STAGE_OPTIONS = [
  { value: '', label: 'Qualquer etapa' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'SOLICITANTE', label: 'Solicitante' },
  { value: 'IMOBILIZADO', label: 'Aprovador - Imobilizado' },
  { value: 'APROVADOR', label: 'Aprovador - Administrativo' },
  { value: 'RETORNO_SOLICITANTE', label: 'Retorno solicitante' },
  { value: 'ENCERRADO', label: 'Encerramento' },
];

type RequestRegistrySearchProps = {
  filters: RegistrySearchFilters;
  onChange: (next: RegistrySearchFilters) => void;
  onSubmit: () => void;
  onClear: () => void;
  families: Family[];
  hotels: Hotel[];
  users: { id: string; name: string }[];
  resultCount?: number;
  loading?: boolean;
};

function countActiveFilters(f: RegistrySearchFilters) {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.type) n++;
  if (f.itemsMode) n++;
  if (f.stage) n++;
  if (f.familyIds.length) n++;
  if (f.hotelIds.length) n++;
  if (f.requesterIds.length) n++;
  if (f.operatorIds.length) n++;
  if (f.operatorStage) n++;
  if (f.sla) n++;
  if (f.submittedFrom || f.submittedTo) n++;
  if (f.closedFrom || f.closedTo) n++;
  if (f.mineOnly) n++;
  return n;
}

function patch(
  filters: RegistrySearchFilters,
  partial: Partial<RegistrySearchFilters>,
): RegistrySearchFilters {
  return { ...filters, ...partial };
}

/** Painel de busca avançada para localizar solicitações na operação. */
export function RequestRegistrySearch({
  filters,
  onChange,
  onSubmit,
  onClear,
  families,
  hotels,
  users,
  resultCount,
  loading,
}: RequestRegistrySearchProps) {
  const active = countActiveFilters(filters);

  return (
    <form
      className="registry-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="registry-search__header">
        <div>
          <h2 className="registry-search__title">Busca avançada</h2>
          <p className="registry-search__hint">
            Combine texto livre com filtros de família, hotel, solicitante, operador, datas e destino.
          </p>
        </div>
        <div className="registry-search__meta">
          {active > 0 ? (
            <span className="registry-search__active">{active} filtro(s) ativo(s)</span>
          ) : null}
          <span className="registry-search__count">
            {loading ? 'Buscando…' : `${resultCount ?? 0} resultado(s)`}
          </span>
        </div>
      </div>

      <label className="registry-search__field registry-search__field--wide">
        <span>Texto livre</span>
        <input
          value={filters.search}
          onChange={(e) => onChange(patch(filters, { search: e.target.value }))}
          placeholder="Descrição, código, NCM, família, hotel, solicitante, operador ou comentário de etapa…"
        />
      </label>

      <div className="registry-search__grid">
        <label className="registry-search__field">
          <span>Tipo</span>
          <select
            value={filters.type}
            onChange={(e) => onChange(patch(filters, { type: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="INCLUSAO">Inclusão</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="BLOQUEIO_PARCIAL">Bloqueio parcial</option>
            <option value="BLOQUEIO_TOTAL">Bloqueio total</option>
          </select>
        </label>

        <label className="registry-search__field">
          <span>Itens no lote</span>
          <select
            value={filters.itemsMode}
            onChange={(e) =>
              onChange(patch(filters, { itemsMode: e.target.value as RegistrySearchFilters['itemsMode'] }))
            }
          >
            <option value="">Todos</option>
            <option value="single">Um produto</option>
            <option value="multi">Mais de um</option>
          </select>
        </label>

        <label className="registry-search__field">
          <span>Etapa / destino</span>
          <select
            value={filters.stage}
            onChange={(e) => onChange(patch(filters, { stage: e.target.value }))}
          >
            {REGISTRY_STAGE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="registry-search__field">
          <span>SLA na etapa</span>
          <select
            value={filters.sla}
            onChange={(e) =>
              onChange(patch(filters, { sla: e.target.value as RegistrySearchFilters['sla'] }))
            }
          >
            <option value="">Todos</option>
            <option value="on_time">No prazo</option>
            <option value="late">Atrasadas (≥ 2 dias)</option>
          </select>
        </label>

        <MultiFilter
          label="Família"
          options={families.map((f) => ({ id: f.id, label: `${f.code} — ${f.name}` }))}
          selected={filters.familyIds}
          onChange={(familyIds) => onChange(patch(filters, { familyIds }))}
        />

        <MultiFilter
          label="Hotel"
          options={hotels.map((h) => ({ id: h.id, label: `${h.code} — ${h.name}` }))}
          selected={filters.hotelIds}
          onChange={(hotelIds) => onChange(patch(filters, { hotelIds }))}
        />

        <MultiFilter
          label="Solicitante"
          options={users.map((u) => ({ id: u.id, label: u.name }))}
          selected={filters.requesterIds}
          onChange={(requesterIds) => onChange(patch(filters, { requesterIds }))}
        />

        <MultiFilter
          label="Operador"
          options={users.map((u) => ({ id: u.id, label: u.name }))}
          selected={filters.operatorIds}
          onChange={(operatorIds) => onChange(patch(filters, { operatorIds }))}
        />

        <label className="registry-search__field">
          <span>Etapa do operador</span>
          <select
            value={filters.operatorStage}
            onChange={(e) => onChange(patch(filters, { operatorStage: e.target.value }))}
            disabled={!filters.operatorIds.length}
            title={filters.operatorIds.length ? undefined : 'Selecione ao menos um operador'}
          >
            {OPERATOR_STAGE_OPTIONS.map((opt) => (
              <option key={opt.value || 'any'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="registry-search__field">
          <span>Envio — de</span>
          <input
            type="date"
            value={filters.submittedFrom}
            onChange={(e) => onChange(patch(filters, { submittedFrom: e.target.value }))}
          />
        </label>

        <label className="registry-search__field">
          <span>Envio — até</span>
          <input
            type="date"
            value={filters.submittedTo}
            onChange={(e) => onChange(patch(filters, { submittedTo: e.target.value }))}
          />
        </label>

        <label className="registry-search__field">
          <span>Encerramento — de</span>
          <input
            type="date"
            value={filters.closedFrom}
            onChange={(e) => onChange(patch(filters, { closedFrom: e.target.value }))}
          />
        </label>

        <label className="registry-search__field">
          <span>Encerramento — até</span>
          <input
            type="date"
            value={filters.closedTo}
            onChange={(e) => onChange(patch(filters, { closedTo: e.target.value }))}
          />
        </label>

        <label className="registry-search__check">
          <input
            type="checkbox"
            checked={filters.mineOnly}
            onChange={(e) => onChange(patch(filters, { mineOnly: e.target.checked }))}
          />
          Somente minhas solicitações
        </label>
      </div>

      <div className="registry-search__actions">
        <button type="button" className="btn btn-outline" onClick={onClear}>
          Limpar busca
        </button>
        <button type="submit" className="btn btn-primary">
          Buscar
        </button>
      </div>
    </form>
  );
}

/** Converte estado UI → parâmetros da API. */
export function registryFiltersToApi(f: RegistrySearchFilters) {
  return {
    search: f.search || undefined,
    type: f.type || undefined,
    itemsMode: f.itemsMode || undefined,
    stage: f.stage || undefined,
    familyIds: f.familyIds.length ? f.familyIds : undefined,
    hotelIds: f.hotelIds.length ? f.hotelIds : undefined,
    requesterIds: f.requesterIds.length ? f.requesterIds : undefined,
    operatorIds: f.operatorIds.length ? f.operatorIds : undefined,
    operatorStage: f.operatorStage || undefined,
    sla: f.sla || undefined,
    submittedFrom: f.submittedFrom || undefined,
    submittedTo: f.submittedTo || undefined,
    closedFrom: f.closedFrom || undefined,
    closedTo: f.closedTo || undefined,
    mine: f.mineOnly || undefined,
  };
}
