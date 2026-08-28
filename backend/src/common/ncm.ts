/**
 * Normalização e exibição de NCM (TIPI).
 * Canônico no banco: 8 dígitos sem pontuação (CHAR(8)).
 * UI: 9999.99.99
 */

/** Extrai 8 dígitos; null se inválido. Trata data Excel (A1) → AAAA+MM+DD. */
export function normalizeNcmCode(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    const digits = `${y}${m}${d}`.replace(/\D/g, '');
    return digits.length >= 8 ? digits.slice(0, 8) : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const digits = String(Math.trunc(raw)).replace(/\D/g, '');
    if (!digits) return null;
    return digits.padStart(8, '0').slice(-8);
  }
  const s = String(raw).trim();
  if (!s) return null;
  const dateLike = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (dateLike) {
    return `${dateLike[1]}${dateLike[2]}${dateLike[3]}`.slice(0, 8);
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.length === 8) return digits;
  return digits.slice(0, 8);
}

/** Formata 8 dígitos para exibição 9999.99.99. */
export function formatNcmDisplay(code: string | null | undefined): string {
  if (!code) return '';
  const digits = String(code).replace(/\D/g, '');
  if (digits.length !== 8) return String(code).trim();
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}
