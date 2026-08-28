import { Icon } from './Icon';
import { familyGroupVisual, itemTileLabel } from '../lib/familyVisual';
import { buildPdmFolderTree, type PdmFolderItem } from '../lib/pdmFolders';
import type { CatalogGroup, CatalogSubgroup } from '../lib/types';
import './ItemFolderStrip.css';

type Props = {
  items: PdmFolderItem[];
  currentIndex: number;
  groups: CatalogGroup[];
  subgroups: CatalogSubgroup[];
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Em alteração (1 produto), oculta “Novo item”. */
  allowAdd?: boolean;
  /** Texto exibido no lugar do botão Novo item quando allowAdd=false. */
  addLockedLabel?: string;
  /** Em alteração, não permite remover o único item vinculado. */
  allowRemove?: boolean;
};

/**
 * Navegação visual em pastas — Subgrupo → Grupo (dentro da família do lote).
 */
export function ItemFolderStrip({
  items,
  currentIndex,
  groups,
  subgroups,
  onSelect,
  onAdd,
  onRemove,
  allowAdd = true,
  addLockedLabel = 'Alteração — 1 item vinculado ao produto',
  allowRemove = true,
}: Props) {
  const tree = buildPdmFolderTree(items, groups, subgroups);

  return (
    <div className="item-folder-strip">
      <div className="item-folder-strip-head">
        <p className="item-folder-strip-label">Itens desta solicitação</p>
        {allowAdd ? (
          <button type="button" className="item-folder-add-inline" onClick={onAdd} aria-label="Adicionar item">
            <Icon name="plus-circle" size={20} />
            <span>Novo item</span>
          </button>
        ) : (
          <span className="item-folder-add-locked">{addLockedLabel}</span>
        )}
      </div>

      {tree.map((sgFolder) => {
        const sgVisual = familyGroupVisual(sgFolder.subgroup?.code);
        const subgroupLabel = sgFolder.subgroup
          ? `${sgFolder.subgroup.code} — ${sgFolder.subgroup.name}`
          : 'Sem classificação';

        return (
          <section key={sgFolder.key} className="item-folder-group">
            <header className="item-folder-group-header">
              <span className="item-folder-group-icon" style={{ background: sgVisual.bg, color: sgVisual.color }}>
                <Icon name={sgVisual.icon} size={22} />
              </span>
              <h3 className="item-folder-group-title">{subgroupLabel}</h3>
            </header>

            {sgFolder.groups.map((gFolder) => {
              const gLabel = gFolder.group
                ? `${gFolder.group.code} — ${gFolder.group.name}`
                : 'Grupo pendente';

              return (
                <div key={gFolder.key} className="item-folder-subgroup">
                  <p className="item-folder-subgroup-label">{gLabel}</p>
                  <div className="item-folder-row">
                    {gFolder.itemIndexes.map((index) => {
                      const item = items[index];
                      const active = index === currentIndex;
                      return (
                        <div key={index} className={`item-folder-tile ${active ? 'active' : ''}`}>
                          {allowRemove ? (
                            <button
                              type="button"
                              className="item-folder-remove"
                              aria-label={`Remover item ${index + 1}`}
                              onClick={() => onRemove(index)}
                            >
                              ×
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="item-folder-body"
                            onClick={() => onSelect(index)}
                            aria-pressed={active}
                          >
                            <span
                              className="item-folder-icon"
                              style={{ background: sgVisual.bg, color: sgVisual.color }}
                            >
                              <Icon name={sgVisual.icon} size={36} />
                            </span>
                            <span className="item-folder-name">
                              {itemTileLabel(item.descriptionShort, index)}
                            </span>
                            <span className="item-folder-meta">Item {index + 1}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
