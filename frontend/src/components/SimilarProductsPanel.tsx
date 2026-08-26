import { DataTable } from './DataTable';
import { HotelCodeBadges } from './HotelCodeBadges';
import type { ProductSearchResult } from '../lib/types';
import './SimilarProductsPanel.css';
import './HotelCodeBadges.css';

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
            ? 'Selecione o produto a atualizar'
            : 'Itens parecidos já cadastrados na base'}
        </p>
        {selectable ? (
          <p className="similar-products-advisory-msg">
            Clique na linha do produto que deseja alterar. A solicitação ficará vinculada a esse
            item (apenas um produto por solicitação de alteração).
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
      <DataTable
        rows={results}
        rowKey={(r) => r.id}
        selectedRowKey={selectable ? selectedId ?? undefined : undefined}
        onRowClick={selectable ? onSelect : undefined}
        columns={[
          { key: 'code', header: 'Código Unificado', render: (r) => r.unifiedCode ?? '—' },
          {
            key: 'desc',
            header: 'Descrição',
            render: (r) => (
              <span>
                {r.descriptionShort}
                {r.similarity >= 0.5 ? (
                  <span className="similarity-warning"> — alta similaridade</span>
                ) : null}
              </span>
            ),
          },
          { key: 'family', header: 'Família', render: (r) => r.familyName },
          {
            key: 'hotels',
            header: 'Unidades',
            render: (r) => <HotelCodeBadges codes={r.hotelCodes} />,
          },
          {
            key: 'sim',
            header: 'Match',
            render: (r) => `${Math.round(r.similarity * 100)}%`,
          },
        ]}
      />
    </div>
  );
}
