import type { CSSProperties } from 'react';
import { getHotelColor, HOTEL_CODES_ORDER } from '../lib/hotelColors';
import './HotelCodeBadges.css';

type Props = {
  codes: string[];
  /** Exibe legenda com todas as unidades (cor + nome completo). */
  showLegend?: boolean;
};

/** Badges coloridos por unidade — indica onde o item está cadastrado na base. */
export function HotelCodeBadges({ codes, showLegend = false }: Props) {
  const unique = [...new Set(codes.map((c) => c.toUpperCase()).filter(Boolean))];

  const legend = showLegend ? (
    <div className="hotel-badges-legend" role="list" aria-label="Legenda das unidades na base">
      {HOTEL_CODES_ORDER.map((code) => {
        const c = getHotelColor(code);
        return (
          <span key={code} className="hotel-legend-item" role="listitem">
            <span className="hotel-badge hotel-badge--legend" style={badgeStyle(c)}>
              {code}
            </span>
            <span className="hotel-legend-name">{c.name}</span>
          </span>
        );
      })}
    </div>
  ) : null;

  if (!unique.length && !showLegend) {
    return <span className="hotel-badges-empty">—</span>;
  }

  return (
    <div className="hotel-badges-wrap">
      {legend}
      {unique.length ? (
        <div className="hotel-badges-row">
          {unique.map((code) => {
            const c = getHotelColor(code);
            return (
              <span
                key={code}
                className="hotel-badge"
                style={badgeStyle(c)}
                title={`${code} — ${c.name}`}
              >
                {code}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function badgeStyle(c: ReturnType<typeof getHotelColor>): CSSProperties {
  return {
    backgroundColor: c.bg,
    borderColor: c.border,
    color: c.text,
  };
}
