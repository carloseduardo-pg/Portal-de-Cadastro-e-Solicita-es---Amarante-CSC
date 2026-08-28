import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { FormField } from './FormField';
import { SearchableSelect } from './SearchableSelect';
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
  /** Ativo fixo */
  unitQuantity?: string;
  physicalLocation?: string;
  assetTag?: string;
  acquisitionValue?: string;
  acquisitionDate?: string;
  usefulLifeMonths?: string;
  depreciationRate?: string;
  supplierDocument?: string;
  invoiceNumber?: string;
};

export type ItemPrimaryErrors = {
  descriptionShort?: string;
  costCenterId?: string;
  measureUnitId?: string;
  unitQuantity?: string;
  physicalLocation?: string;
  duplicate?: string;
};

type Props = {
  value: ItemPrimaryValue;
  costCenters: CostCenter[];
  measureUnits: MeasureUnit[];
  errors?: ItemPrimaryErrors;
  similarPanel?: ReactNode;
  readOnly?: boolean;
  /** Ativo fixo: sem UM, sem qty de compra; exibe campos patrimoniais. */
  hideMeasureUnit?: boolean;
  onChange?: (patch: Partial<ItemPrimaryValue>) => void;
  onClearError?: (key: keyof ItemPrimaryErrors) => void;
};

/**
 * Campos principais do item — descrição, centro de custo, UM/AF, valor e códigos.
 */
export function ItemPrimaryFields({
  value,
  costCenters,
  measureUnits,
  errors,
  similarPanel,
  readOnly = false,
  hideMeasureUnit = false,
  onChange,
  onClearError,
}: Props) {
  const fixedAsset = hideMeasureUnit;

  const costCenterOptions = useMemo(
    () =>
      [...costCenters]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
            a.code.localeCompare(b.code),
        )
        .map((cc) => ({
          id: cc.id,
          label: `${cc.hotel?.code ? `${cc.hotel.code} · ` : ''}${cc.code} — ${cc.name}`,
          searchText: `${cc.hotel?.code ?? ''} ${cc.code} ${cc.name}`,
        })),
    [costCenters],
  );

  const measureUnitOptions = useMemo(
    () =>
      [...measureUnits]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
            a.code.localeCompare(b.code),
        )
        .map((mu) => ({
          id: mu.id,
          label: `${mu.code} — ${mu.name}`,
          searchText: `${mu.code} ${mu.name}`,
        })),
    [measureUnits],
  );

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
        {readOnly ? (
          <select value={value.costCenterId} disabled>
            <option value={value.costCenterId}>
              {costCenterOptions.find((o) => o.id === value.costCenterId)?.label ?? '—'}
            </option>
          </select>
        ) : (
          <SearchableSelect
            label=""
            options={costCenterOptions}
            value={value.costCenterId}
            onChange={(id) => {
              onChange?.({ costCenterId: id });
              onClearError?.('costCenterId');
            }}
            placeholder="Digite hotel, código ou nome do centro…"
            emptyLabel="Selecione…"
          />
        )}
      </FormField>

      {!fixedAsset ? (
        <FormField
          label="Unidade de medida"
          required
          error={errors?.measureUnitId}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-4"
        >
          {readOnly ? (
            <select value={value.measureUnitId} disabled>
              <option value={value.measureUnitId}>
                {measureUnitOptions.find((o) => o.id === value.measureUnitId)?.label ?? '—'}
              </option>
            </select>
          ) : (
            <SearchableSelect
              label=""
              options={measureUnitOptions}
              value={value.measureUnitId}
              onChange={(id) => {
                onChange?.({ measureUnitId: id });
                onClearError?.('measureUnitId');
              }}
              placeholder="Digite código ou nome da unidade…"
              emptyLabel="Selecione…"
            />
          )}
        </FormField>
      ) : (
        <FormField
          label="Quantidade de unidades"
          required
          error={errors?.unitQuantity}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-4"
          hint="Quantas unidades físicas deste bem serão cadastradas nesta solicitação."
        >
          <input
            type="number"
            step="1"
            min="1"
            placeholder="1"
            value={value.unitQuantity ?? ''}
            readOnly={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              onChange?.({ unitQuantity: e.target.value });
              onClearError?.('unitQuantity');
            }}
          />
        </FormField>
      )}

      {similarPanel ? (
        <div className="item-primary-similar-row pdm-span-12">{similarPanel}</div>
      ) : null}

      {fixedAsset ? (
        <FormField
          label="Localização física"
          required
          error={errors?.physicalLocation}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-8"
        >
          <input
            className="input-uppercase"
            value={value.physicalLocation ?? ''}
            readOnly={readOnly}
            placeholder="EX.: SALA TI · ANDAR 2 · BLOCO A"
            onChange={(e) => {
              if (readOnly) return;
              onChange?.({ physicalLocation: e.target.value });
              onClearError?.('physicalLocation');
            }}
          />
        </FormField>
      ) : null}

      {!fixedAsset ? (
        <>
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
        </>
      ) : null}

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

      {!fixedAsset ? (
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
      ) : (
        <div className="pdm-span-4" aria-hidden />
      )}

      {fixedAsset ? (
        <div className="pdm-span-12 item-af-accounting">
          <p className="form-section-title">Campos contábeis (opcional)</p>
          <p className="item-af-accounting-hint">
            Preencha apenas se já tiver os dados. Nenhum valor padrão é aplicado — campos vazios
            permanecem em branco.
          </p>
          <div className="pdm-classification-grid">
            <FormField label="Nº patrimônio" className="pdm-span-4">
              <input
                className="input-uppercase"
                value={value.assetTag ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ assetTag: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Valor de aquisição" className="pdm-span-4">
              <div className="input-currency-wrap">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={value.acquisitionValue ?? ''}
                  readOnly={readOnly}
                  onChange={(e) => {
                    if (readOnly) return;
                    onChange?.({ acquisitionValue: e.target.value });
                  }}
                />
                <span className="input-currency-suffix" aria-hidden>
                  R$
                </span>
              </div>
            </FormField>
            <FormField label="Data de aquisição" className="pdm-span-4">
              <input
                type="date"
                value={value.acquisitionDate ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ acquisitionDate: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Vida útil (meses)" className="pdm-span-4">
              <input
                type="number"
                step="1"
                min="1"
                value={value.usefulLifeMonths ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ usefulLifeMonths: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Taxa de depreciação" className="pdm-span-4">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={value.depreciationRate ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ depreciationRate: e.target.value });
                }}
              />
            </FormField>
            <FormField label="CNPJ / documento fornecedor" className="pdm-span-4">
              <input
                value={value.supplierDocument ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ supplierDocument: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Nº nota fiscal" className="pdm-span-4">
              <input
                className="input-uppercase"
                value={value.invoiceNumber ?? ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  onChange?.({ invoiceNumber: e.target.value });
                }}
              />
            </FormField>
          </div>
        </div>
      ) : null}
    </div>
  );
}
