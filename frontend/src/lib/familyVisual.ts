import type { IconName } from '../components/Icon';

/** Visual por grupo PDM (1=alimentos, 2=bebidas, 3=uniformes…). */
export function familyGroupVisual(groupCode?: string): {
  icon: IconName;
  color: string;
  bg: string;
  label: string;
} {
  switch (groupCode) {
    case '1':
      return { icon: 'box', color: '#094111', bg: '#ecfdf3', label: 'Alimentos' };
    case '2':
      return { icon: 'cart', color: '#2563EB', bg: '#eff6ff', label: 'Bebidas' };
    case '3':
      return { icon: 'user-check', color: '#7C3AED', bg: '#f5f3ff', label: 'Uniformes' };
    default:
      return { icon: 'archive', color: '#6B7280', bg: '#f3f4f6', label: 'Produto' };
  }
}

/** Rótulo curto para tile de item. */
export function itemTileLabel(descriptionShort: string, index: number) {
  const trimmed = descriptionShort.trim();
  if (!trimmed) return `Item ${index + 1}`;
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
}
