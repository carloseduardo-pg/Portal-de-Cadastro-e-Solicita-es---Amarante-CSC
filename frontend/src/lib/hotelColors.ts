export type HotelColor = {
  bg: string;
  border: string;
  text: string;
  name: string;
};

/** Cores fixas por unidade Amarante — identificação visual em listagens. */
export const HOTEL_COLORS: Record<string, HotelColor> = {
  MCZ: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a', name: 'Maceió' },
  MGI: { bg: '#dcfce7', border: '#22c55e', text: '#14532d', name: 'Maragogi' },
  JPT: { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95', name: 'Japaratinga' },
  SALG: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', name: 'Salinas' },
  MV4: { bg: '#e2e8f0', border: '#64748b', text: '#334155', name: 'MV4 Corporativo' },
};

const FALLBACK: HotelColor = {
  bg: '#edf2e7',
  border: '#7e975b',
  text: '#094111',
  name: 'Unidade',
};

/** Retorna tokens de cor para o código do hotel (ex.: MCZ). */
export function getHotelColor(code: string): HotelColor {
  return HOTEL_COLORS[code.toUpperCase()] ?? FALLBACK;
}

/** Códigos conhecidos na ordem de exibição da legenda. */
export const HOTEL_CODES_ORDER = ['MCZ', 'MGI', 'JPT', 'SALG', 'MV4'] as const;
