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
 * Navegação visual em pastas — agrupada por Grupo → Subgrupo (ITM-11 na família).
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

      {tree.map((groupFolder) => {
        const gVisual = familyGroupVisual(groupFolder.group?.code);
        const groupLabel = groupFolder.group
          ? `${groupFolder.group.code} — ${groupFolder.group.name}`
          : 'Sem classificação';

        return (
          <section key={groupFolder.key} className="item-folder-group">
            <header className="item-folder-group-header">
              <span className="item-folder-group-icon" style={{ background: gVisual.bg, color: gVisual.color }}>
                <Icon name={gVisual.icon} size={22} />
              </span>
              <h3 className="item-folder-group-title">{groupLabel}</h3>
            </header>

            {groupFolder.subgroups.map((sgFolder) => {
              const sgLabel = sgFolder.subgroup
                ? `${sgFolder.subgroup.code} — ${sgFolder.subgroup.name}`
                : 'Subgrupo pendente';

              return (
                <div key={sgFolder.key} className="item-folder-subgroup">
                  <p className="item-folder-subgroup-label">{sgLabel}</p>
                  <div className="item-folder-row">
                    {sgFolder.itemIndexes.map((index) => {
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
                              style={{ background: gVisual.bg, color: gVisual.color }}
                            >
                              <Icon name={gVisual.icon} size={36} />
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
