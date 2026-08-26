import type { ReactNode } from 'react';
import { FormField } from './FormField';
import type { CostCenter, MeasureUnit } from '../lib/types';
import './PdmClassificationFields.css';

export type ItemPrimaryValue = {
  descriptionShort: string;
  costCenterId: string;
  measureUnitId: string;
  itemValue: string;
  purchaseQtyTotal: string;
  unifiedCode: string;
  legacyCode: string;
  law116: string;
};

export type ItemPrimaryErrors = {
  descriptionShort?: string;
  costCenterId?: string;
  measureUnitId?: string;
  duplicate?: string;
};

type Props = {
  value: ItemPrimaryValue;
  costCenters: CostCenter[];
  measureUnits: MeasureUnit[];
  errors?: ItemPrimaryErrors;
  similarPanel?: ReactNode;
  readOnly?: boolean;
  onChange?: (patch: Partial<ItemPrimaryValue>) => void;
  onClearError?: (key: keyof ItemPrimaryErrors) => void;
};

/**
 * Campos principais do item — descrição, centro de custo, UM, valor e códigos (estilo Semplice).
 */
export function ItemPrimaryFields({
  value,
  costCenters,
  measureUnits,
  errors,
  similarPanel,
  readOnly = false,
  onChange,
  onClearError,
}: Props) {
  return (
    <div className="pdm-classification-grid item-primary-fields">
      <FormField
        label="Descrição produto"
        required
        error={errors?.descriptionShort || errors?.duplicate}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        <input
          className="input-uppercase"
          value={value.descriptionShort}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ descriptionShort: e.target.value });
            onClearError?.('descriptionShort');
            onClearError?.('duplicate');
          }}
        />
      </FormField>

      <FormField
        label="Centro de custo"
        required
        error={errors?.costCenterId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        <select
          value={value.costCenterId}
          disabled={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ costCenterId: e.target.value });
            onClearError?.('costCenterId');
          }}
        >
          <option value="">Selecione…</option>
          {costCenters.map((cc) => (
            <option key={cc.id} value={cc.id}>
              {cc.hotel?.code ? `${cc.hotel.code} · ` : ''}
              {cc.code} — {cc.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Unidade de medida"
        required
        error={errors?.measureUnitId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        <select
          value={value.measureUnitId}
          disabled={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ measureUnitId: e.target.value });
            onClearError?.('measureUnitId');
          }}
        >
          <option value="">Selecione…</option>
          {measureUnits.map((mu) => (
            <option key={mu.id} value={mu.id}>
              {mu.code} — {mu.name}
            </option>
          ))}
        </select>
      </FormField>

      {similarPanel ? (
        <div className="item-primary-similar-row pdm-span-12">{similarPanel}</div>
      ) : null}

      <FormField label="Valor do item" className="pdm-span-4">
        <div className="input-currency-wrap">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={value.itemValue}
            readOnly={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              onChange?.({ itemValue: e.target.value });
            }}
          />
          <span className="input-currency-suffix" aria-hidden>
            R$
          </span>
        </div>
      </FormField>

      <FormField label="Quantidade total de compras" className="pdm-span-4">
        <input
          type="number"
          step="0.001"
          min="0"
          placeholder="0,00"
          value={value.purchaseQtyTotal}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ purchaseQtyTotal: e.target.value });
          }}
        />
      </FormField>

      <div className="pdm-span-4" aria-hidden />

      <FormField label="Código unificado" className="pdm-span-4">
        <input
          value={value.unifiedCode}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ unifiedCode: e.target.value });
          }}
        />
      </FormField>

      <FormField label="Código legado" className="pdm-span-4">
        <input
          className="input-uppercase"
          value={value.legacyCode}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ legacyCode: e.target.value });
          }}
        />
      </FormField>

      <FormField label="Lei 116" className="pdm-span-4">
        <input
          type="number"
          step="1"
          min="0"
          value={value.law116}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            onChange?.({ law116: e.target.value });
          }}
        />
      </FormField>
    </div>
  );
}
