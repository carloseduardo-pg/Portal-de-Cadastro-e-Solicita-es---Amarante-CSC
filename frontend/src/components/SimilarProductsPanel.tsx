import { DataTable } from './DataTable';
import { HotelCodeBadges } from './HotelCodeBadges';
import { ProductStatusDot } from './ProductStatusDot';
import { formatNcmDisplay } from '../lib/ncm';
import type { ProductSearchResult } from '../lib/types';
import './SimilarProductsPanel.css';
import './HotelCodeBadges.css';
import './ProductStatusDot.css';

type Props = {
  results: ProductSearchResult[];
  loading?: boolean;
  searched?: boolean;
  query?: string;
  /**
   * Modo informativo quando há similares: lista para revisão, sem bloquear avanço
   * (justificativa via observação da solicitação).
   */
  advisory?: boolean;
  /** @deprecated Use advisory — mantido para compatibilidade. */
  blocking?: boolean;
  /** Legenda de cores das unidades acima da tabela. */
  showHotelLegend?: boolean;
  /** Permite selecionar uma linha (fluxo de alteração). */
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (row: ProductSearchResult) => void;
};

/** Lista itens já cadastrados na base unificada (SAP) parecidos com a descrição digitada. */
export function SimilarProductsPanel({
  results,
  loading,
  searched,
  query,
  advisory = false,
  blocking,
  showHotelLegend = false,
  selectable = false,
  selectedId,
  onSelect,
}: Props) {
  const isAdvisory = advisory || blocking === false;
  if (loading) {
    return <p className="similar-products-loading">Verificando base unificada…</p>;
  }

  if (!searched || results.length === 0) {
    if (searched && query && query.trim().length >= 3) {
      return (
        <p className="similar-products-clear">
          Nenhum item parecido encontrado na base para &quot;{query.trim().toUpperCase()}&quot;.
        </p>
      );
    }
    return null;
  }

  return (
    <div
      className={`similar-products-panel ${
        selectable
          ? 'similar-products-panel--selectable'
          : isAdvisory
            ? 'similar-products-panel--advisory'
            : 'similar-products-panel--blocking'
      }`}
    >
      <div className="similar-products-panel-header">
        <p className="form-section-title similar-products-panel-title">
          {selectable
            ? 'Selecione o produto da base'
            : 'Itens parecidos já cadastrados na base'}
        </p>
        {selectable ? (
          <p className="similar-products-advisory-msg">
            Busque por descrição ou por qualquer código (unificado, legado, SAP ou NCM). Clique
            na linha do produto — a solicitação fica vinculada a esse item (um produto por
            solicitação).
          </p>
        ) : isAdvisory ? (
          <p className="similar-products-advisory-msg">
            Revise se algum item abaixo atende sua necessidade. Caso contrário, registre na{' '}
            <strong>observação</strong> por que o cadastro ainda é necessário.
          </p>
        ) : (
          <p className="similar-products-block-msg">
            Este portal é apenas para <strong>solicitar cadastro de itens novos</strong>. Se algum item
            abaixo atende sua necessidade, <strong>não abra uma nova solicitação</strong> — o item já
            existe no unificado SAP.
          </p>
        )}
      </div>
      {showHotelLegend ? (
        <div className="similar-products-legend">
          <p className="similar-products-legend-label">Unidades — cores na base</p>
          <HotelCodeBadges codes={[]} showLegend />
        </div>
      ) : null}
      <p className="product-status-legend">
        <span>
          <ProductStatusDot active />
          Ativo
        </span>
        <span>
          <ProductStatusDot active blockState="PARTIAL" />
          Ativo com bloqueio parcial
        </span>
        <span>
          <ProductStatusDot active={false} />
          Inativo
        </span>
      </p>
      <DataTable
        rows={results}
        rowKey={(r) => r.id}
        selectedRowKey={selectable ? selectedId ?? undefined : undefined}
        onRowClick={selectable ? onSelect : undefined}
        columns={[
          {
            key: 'code',
            header: 'Código',
            render: (r) =>
              r.legacyCode?.trim() || r.unifiedCode?.trim() || r.sapCode?.trim() || '—',
          },
          {
            key: 'desc',
            header: 'Descrição',
            render: (r) => (
              <span>
                <ProductStatusDot active={r.active} blockState={r.blockState} />
                {r.descriptionShort}
                {r.similarity >= 0.5 ? (
                  <span className="similarity-warning"> — alta similaridade</span>
                ) : null}
              </span>
            ),
          },
          {
            key: 'sim',
            header: 'Match',
            render: (r) => `${Math.round(r.similarity * 100)}%`,
          },
          { key: 'family', header: 'Família', render: (r) => r.familyName || '—' },
          {
            key: 'subgroup',
            header: 'Subgrupo',
            render: (r) => r.subgroupName?.trim() || '—',
          },
          {
            key: 'group',
            header: 'Grupo',
            render: (r) => r.groupName?.trim() || '—',
          },
          {
            key: 'ncm',
            header: 'Código NCM',
            render: (r) => formatNcmDisplay(r.ncmCode) || '—',
          },
          {
            key: 'uom',
            header: 'Unidade de medida',
            render: (r) => r.measureUnitCode?.trim() || '—',
          },
          {
            key: 'hotels',
            header: 'Unidades',
            render: (r) => <HotelCodeBadges codes={r.hotelCodes} />,
          },
        ]}
      />
    </div>
  );
}
