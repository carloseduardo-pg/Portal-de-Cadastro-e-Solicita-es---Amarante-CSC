type StatusToggleProps = {
  active: boolean;
  onChange: (active: boolean) => void;
};

/** ATIVO/INATIVO control shared by resource create and edit dialogs. */
export function StatusToggle({ active, onChange }: StatusToggleProps) {
  return (
    <div className="status-toggle" role="group" aria-label="Status">
      <button type="button" className={active ? 'is-active' : undefined} onClick={() => onChange(true)}>
        ATIVO
      </button>
      <button type="button" className={!active ? 'is-inactive' : undefined} onClick={() => onChange(false)}>
        INATIVO
      </button>
    </div>
  );
}
