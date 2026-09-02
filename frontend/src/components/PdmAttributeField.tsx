import { useEffect, useState } from 'react';
import { FormField } from './FormField';
import {
  PDM_ATTR_OTHER,
  pdmAttributeInputMode,
  pdmAttributeOptions,
} from '../lib/pdmAttributeInput';
import { toFormUppercase } from '../lib/formText';
import type { ProductAttribute } from '../lib/types';
import './FormField.css';

type Props = {
  attr: ProductAttribute;
  value: string;
  onChange: (next: string) => void;
};

/**
 * Campo de atributo PDM demo: texto livre, select fechado ou select + Outro.
 */
export function PdmAttributeField({ attr, value, onChange }: Props) {
  const mode = pdmAttributeInputMode(attr);
  const options = pdmAttributeOptions(attr);
  const [otherMode, setOtherMode] = useState(
    () => mode === 'select_other' && value !== '' && !options.includes(value),
  );

  useEffect(() => {
    if (mode !== 'select_other') {
      setOtherMode(false);
      return;
    }
    if (value && options.includes(value)) setOtherMode(false);
    else if (value && !options.includes(value)) setOtherMode(true);
  }, [mode, value, options]);

  const selectValue =
    mode === 'text' ? '' : otherMode ? PDM_ATTR_OTHER : value;

  const hint =
    mode === 'text'
      ? attr.examples.slice(0, 2).join(' · ')
        ? `Ex.: ${attr.examples.slice(0, 2).join(' · ')}`
        : undefined
      : mode === 'select_other'
        ? 'Selecione uma opção ou Outro para digitar.'
        : undefined;

  return (
    <FormField label={attr.name} required={attr.required} hint={hint}>
      {mode === 'text' ? (
        <input
          className="input-uppercase"
          value={value}
          placeholder={attr.examples[0] ?? ''}
          onChange={(e) => onChange(toFormUppercase(e.target.value))}
        />
      ) : (
        <>
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === PDM_ATTR_OTHER) {
                setOtherMode(true);
                onChange('');
                return;
              }
              setOtherMode(false);
              onChange(v);
            }}
          >
            <option value="">Selecione…</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            {mode === 'select_other' ? (
              <option value={PDM_ATTR_OTHER}>Outro…</option>
            ) : null}
          </select>
          {mode === 'select_other' && otherMode ? (
            <input
              className="input-uppercase"
              style={{ marginTop: 8 }}
              value={value}
              placeholder="Digite o valor"
              onChange={(e) => onChange(toFormUppercase(e.target.value))}
              autoFocus
            />
          ) : null}
        </>
      )}
    </FormField>
  );
}
