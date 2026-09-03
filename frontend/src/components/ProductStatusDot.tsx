import './ProductStatusDot.css';

type Props = {
  active?: boolean | null;
  /** Escopo do bloqueio vigente na base (parcial mantém o item ativo). */
  blockState?: 'NONE' | 'PARTIAL' | 'TOTAL' | string | null;
};

/**
 * Indicador de status do produto em listas: verde = ativo, vermelho = inativo.
 * Ocupa o lugar de um ícone, sem consumir uma coluna da tabela.
 */
export function ProductStatusDot({ active, blockState }: Props) {
  const isActive = active !== false;
  const partial = isActive && blockState === 'PARTIAL';
  const label = !isActive
    ? 'Inativo'
    : partial
      ? 'Ativo com bloqueio parcial'
      : 'Ativo';

  return (
    <span
      className={`product-status-dot${
        isActive
          ? partial
            ? ' product-status-dot--partial'
            : ' product-status-dot--active'
          : ' product-status-dot--inactive'
      }`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
