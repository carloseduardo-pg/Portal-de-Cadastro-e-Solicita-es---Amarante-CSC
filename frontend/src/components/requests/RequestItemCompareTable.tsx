import type { ProductBase, RequestItem } from '../../lib/types';
import { formatNcmDisplay } from '../../lib/ncm';
import { blockScopeLabel } from '../../lib/requestLabels';
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

const SOURCE_LABELS: Record<string, string> = {
  NATIONAL: 'Nacional',
  FOREIGN: 'Estrangeiro',
};

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
      baseValue: fmt(base.legacyCode),
      requestValue: fmt(item.legacyCode),
    },
    {
      key: 'ncm',
      label: 'NCM',
      baseValue: formatNcmDisplay(base.ncmCode) || '—',
      requestValue: formatNcmDisplay(item.ncmCode) || '—',
    },
    {
      key: 'group',
      label: 'Grupo de itens',
      baseValue: fmt(base.group?.name),
      requestValue: fmt(item.group?.name),
    },
    {
      key: 'measureUnit',
      label: 'Unidade',
      baseValue: fmt(base.measureUnit?.code),
      requestValue: fmt(item.measureUnit?.code),
    },
    {
      key: 'costCenter',
      label: 'Centro de custo',
      baseValue: fmt(base.costCenter?.code),
      requestValue: fmt(item.costCenter?.code),
    },
    {
      key: 'source',
      label: 'Fonte',
      baseValue: fmt(base.source ? SOURCE_LABELS[base.source] : null),
      requestValue: fmt(item.source ? SOURCE_LABELS[item.source] : null),
    },
    {
      key: 'law116',
      label: 'Lei 116',
      baseValue: fmt(base.law116),
      requestValue: fmt(item.law116),
    },
    {
      key: 'productLink',
      label: 'Link(s)',
      baseValue: fmt(base.productLink),
      requestValue: fmt(
        item.links?.map((l) => l.url).join(', ') || item.productLink,
      ),
    },
    {
      key: 'observation',
      label: 'Observação item',
      baseValue: fmt(base.notes),
      requestValue: fmt(item.itemObservation),
    },
  ];
}

type RequestItemCompareTableProps = {
  baseProduct: ProductBase | null;
  item: RequestItem;
  loading?: boolean;
  /** Bloqueio: escopo pedido (requisição/compras) em vez de diferenças de cadastro. */
  request?: { type?: string; blockRequisition?: boolean; blockPurchase?: boolean };
  isBlockRequest?: boolean;
};

/** Tabela comparativa Base vs solicitação — somente etapa Aprovador - Administrativo. */
export function RequestItemCompareTable({
  baseProduct,
  item,
  loading,
  request,
  isBlockRequest = false,
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
  const changedCount = fields.filter(
    (f) => f.baseValue !== f.requestValue,
  ).length;

  return (
    <section className="request-item-compare" aria-label="Comparativo base versus solicitação">
      <h2 className="form-section-title">
        {isBlockRequest ? 'Item a bloquear' : 'Comparativo — Base vs solicitação'}
      </h2>

      {isBlockRequest && request ? (
        <p className="compare-block-scope">
          Escopo pedido: <strong>{blockScopeLabel(request)}</strong>
          {request.blockRequisition && request.blockPurchase
            ? ' — o item será inativado na base.'
            : ' — o item continua ativo, com o canal marcado bloqueado.'}
        </p>
      ) : (
        <p className="compare-table-summary">
          {changedCount} campo(s) diferente(s) do cadastro atual.
        </p>
      )}

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
              const differs = !isBlockRequest && f.baseValue !== f.requestValue;
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
