import type { ProductBase, RequestItem } from '../../lib/types';
import './RequestItemCompareTable.css';

type CompareField = {
  key: string;
  label: string;
  baseValue: string;
  requestValue: string;
};

function fmt(value: string | null | undefined) {
  const v = value?.trim();
  return v ? v : '—';
}

function buildFields(base: ProductBase, item: RequestItem): CompareField[] {
  return [
    {
      key: 'descriptionShort',
      label: 'Descrição curta',
      baseValue: fmt(base.descriptionShort),
      requestValue: fmt(item.descriptionShort),
    },
    {
      key: 'descriptionLong',
      label: 'Descrição longa',
      baseValue: fmt(base.descriptionLong),
      requestValue: fmt(item.descriptionLong),
    },
    {
      key: 'unifiedCode',
      label: 'Código unificado',
      baseValue: fmt(base.unifiedCode),
      requestValue: fmt(item.unifiedCode),
    },
    {
      key: 'legacyCode',
      label: 'Código legado',
      baseValue: fmt(null),
      requestValue: fmt(item.legacyCode),
    },
    {
      key: 'ncm',
      label: 'NCM',
      baseValue: fmt(base.ncmCode),
      requestValue: fmt(item.ncmCode),
    },
    {
      key: 'measureUnit',
      label: 'Unidade',
      baseValue: fmt(base.measureUnit?.code),
      requestValue: fmt(item.measureUnit?.code),
    },
    {
      key: 'productLink',
      label: 'Link(s)',
      baseValue: fmt(null),
      requestValue: fmt(
        item.links?.map((l) => l.url).join(', ') || item.productLink,
      ),
    },
    {
      key: 'observation',
      label: 'Observação item',
      baseValue: '—',
      requestValue: fmt(item.itemObservation),
    },
  ];
}

type RequestItemCompareTableProps = {
  baseProduct: ProductBase | null;
  item: RequestItem;
  loading?: boolean;
};

/** Tabela comparativa Base vs solicitação — somente etapa Aprovador. */
export function RequestItemCompareTable({
  baseProduct,
  item,
  loading,
}: RequestItemCompareTableProps) {
  if (loading) return <p className="compare-table-loading">Carregando produto da base…</p>;
  if (!baseProduct) {
    return (
      <p className="info-banner">
        Produto da base não encontrado — comparativo indisponível (inclusão pura).
      </p>
    );
  }

  const fields = buildFields(baseProduct, item);

  return (
    <section className="request-item-compare" aria-label="Comparativo base versus solicitação">
      <h2 className="form-section-title">Comparativo — Base vs solicitação</h2>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Base (SAP)</th>
              <th>Solicitação</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const differs =
                f.baseValue !== '—' &&
                f.requestValue !== '—' &&
                f.baseValue !== f.requestValue;
              return (
                <tr key={f.key} className={differs ? 'compare-row--diff' : undefined}>
                  <th scope="row">{f.label}</th>
                  <td>{f.baseValue}</td>
                  <td>{f.requestValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
