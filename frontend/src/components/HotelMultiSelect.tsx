import { FormField } from './FormField';
import { getHotelColor } from '../lib/hotelColors';
import type { Hotel } from '../lib/types';
import './ItemFolderStrip.css';
import './HotelCodeBadges.css';
import './FormField.css';

type Props = {
  hotels: Hotel[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  readOnly?: boolean;
};

/** Seleção em lote de unidades (hotéis) para registro na base. */
export function HotelMultiSelect({ hotels, selectedIds, onChange, error, readOnly = false }: Props) {
  function toggle(id: string) {
    if (readOnly) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  function selectAll() {
    if (readOnly) return;
    onChange(hotels.map((h) => h.id));
  }

  function clearAll() {
    if (readOnly) return;
    onChange([]);
  }

  const selectedHotels = hotels.filter((h) => selectedIds.includes(h.id));

  return (
    <FormField
      label="Unidades (hotéis)"
      required
      error={error}
      hint="Selecione em lote onde os itens serão registrados na base."
      className={error ? 'hotel-multi--invalid' : undefined}
    >
      <div className={`hotel-multi-grid ${error ? 'hotel-multi-grid--invalid' : ''}`}>
        {hotels.map((h) => {
          const c = getHotelColor(h.code);
          const checked = selectedIds.includes(h.id);
          return (
            <label
              key={h.id}
              className="hotel-multi-option"
              style={checked ? { borderColor: c.border, background: c.bg } : undefined}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={readOnly}
                onChange={() => toggle(h.id)}
              />
              <span
                className="hotel-badge hotel-badge--inline"
                style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
              >
                {h.code}
              </span>
              <span>{h.name}</span>
            </label>
          );
        })}
      </div>
      {!readOnly ? (
        <div className="hotel-multi-actions">
          <button type="button" className="btn btn-ghost" onClick={selectAll}>Marcar todas</button>
          <button type="button" className="btn btn-ghost" onClick={clearAll}>Limpar</button>
        </div>
      ) : null}
      {selectedHotels.length ? (
        <div className="hotel-chips">
          {selectedHotels.map((h) => {
            const c = getHotelColor(h.code);
            return (
              <span
                key={h.id}
                className="hotel-badge"
                style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                title={h.name}
              >
                {h.code}
              </span>
            );
          })}
        </div>
      ) : null}
    </FormField>
  );
}
