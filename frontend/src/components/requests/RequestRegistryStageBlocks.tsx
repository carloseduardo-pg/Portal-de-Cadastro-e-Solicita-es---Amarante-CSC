/** Blocos de etapa principal na tela Solicitações (lista analítica). */
export type RegistryStageTab = 'solicitante' | 'aprovador' | 'encerrado';

export type RegistryStageSummary = Record<RegistryStageTab, number>;

type BlockDef = {
  id: RegistryStageTab;
  label: string;
  color: string;
  hint: string;
};

export const REGISTRY_STAGE_BLOCKS: BlockDef[] = [
  {
    id: 'solicitante',
    label: 'Solicitante',
    color: '#F8AB2B',
    hint: 'Rascunho, caixa do solicitante e retorno solicitante',
  },
  {
    id: 'aprovador',
    label: 'Aprovador',
    color: '#7E975B',
    hint: 'Aguardando aprovação',
  },
  {
    id: 'encerrado',
    label: 'Encerrado',
    color: '#094111',
    hint: 'Encerradas — aprovadas, reprovadas ou expiradas',
  },
];

type RequestRegistryStageBlocksProps = {
  tab: RegistryStageTab | '';
  summary?: Partial<RegistryStageSummary> | null;
  onTabChange: (tab: RegistryStageTab | '') => void;
  ariaLabel?: string;
};

/** KPIs clicáveis por etapa principal do fluxo (Produtos — sem Compliance). */
export function RequestRegistryStageBlocks({
  tab,
  summary,
  onTabChange,
  ariaLabel = 'Etapas da solicitação',
}: RequestRegistryStageBlocksProps) {
  return (
    <div className="inbox-blocks" role="tablist" aria-label={ariaLabel}>
      {REGISTRY_STAGE_BLOCKS.map((block) => {
        const active = tab === block.id;
        return (
          <button
            key={block.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={block.hint}
            className={`inbox-block ${active ? 'inbox-block--active' : ''}`}
            style={{
              borderTopColor: block.color,
              background: active
                ? `color-mix(in srgb, ${block.color} 14%, white)`
                : undefined,
            }}
            onClick={() => onTabChange(active ? '' : block.id)}
          >
            <span className="inbox-block-count" style={{ color: block.color }}>
              {summary?.[block.id] ?? 0}
            </span>
            <span className="inbox-block-label">{block.label}</span>
          </button>
        );
      })}
    </div>
  );
}
