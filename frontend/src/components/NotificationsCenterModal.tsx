import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { NotificationListItem } from './NotificationListItem';
import { notificationStageLabel, notificationTypeLabel } from '../lib/notificationLabels';
import { formatRequestDate, requestStateLabel } from '../lib/requestLabels';
import { notificationsApi, type NotificationListStatus } from '../lib/resources';
import type { Notification } from '../lib/types';
import './NotificationsCenterModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: NotificationListStatus;
  onCountsChange?: () => void;
};

/**
 * Central de notificações — modal grande com abas, detalhe e lixeira.
 * Lixeira: recuperar (uma/todas), excluir (uma) ou esvaziar (todas) — sempre com confirmação.
 */
export function NotificationsCenterModal({
  open,
  onClose,
  initialTab = 'unread',
  onCountsChange,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<NotificationListStatus>(initialTab);
  const [items, setItems] = useState<Notification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmTrashAllRead, setConfirmTrashAllRead] = useState(false);
  const [confirmTrashOne, setConfirmTrashOne] = useState(false);
  const [confirmDeleteOne, setConfirmDeleteOne] = useState(false);
  const [confirmRestoreOne, setConfirmRestoreOne] = useState(false);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);

  const selected = items.find((n) => n.id === selectedId) ?? items[0] ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationsApi.list(tab);
      setItems(list);
      setSelectedId((prev) =>
        prev && list.some((n) => n.id === prev) ? prev : (list[0]?.id ?? null),
      );
      onCountsChange?.();
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [tab, onCountsChange]);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, tab, refresh]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }

  async function openNotification(n: Notification) {
    if (!n.readAt && tab !== 'trash') {
      await notificationsApi.markRead(n.id);
      onCountsChange?.();
    }
    onClose();
    navigate(n.linkUrl || '/produtos/caixa-de-entrada');
  }

  const emptyMessages: Record<NotificationListStatus, string> = {
    unread: 'Nenhuma notificação não lida.',
    read: 'Nenhuma notificação lida.',
    trash: 'A lixeira está vazia.',
  };

  return (
    <>
      <div className="notifications-center-backdrop" role="presentation" onClick={onClose}>
        <div
          className="notifications-center-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Central de notificações"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="notifications-center-header">
            <h2>Central de notificações</h2>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Fechar
            </button>
          </header>

          <div className="notifications-center-tabs" role="tablist">
            {(
              [
                ['unread', 'Não lidas'],
                ['read', 'Lidas'],
                ['trash', 'Lixeira'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`notifications-center-tab${tab === id ? ' is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="notifications-center-toolbar">
            {tab === 'unread' ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy || items.length === 0}
                onClick={() => void runAction(() => notificationsApi.markAllRead())}
              >
                Marcar todas como lidas
              </button>
            ) : null}
            {tab === 'read' ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy || items.length === 0}
                onClick={() => setConfirmTrashAllRead(true)}
              >
                <Icon name="trash" size={16} />
                Arquivar todas as lidas
              </button>
            ) : null}
            {tab === 'trash' ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy || items.length === 0}
                  onClick={() => setConfirmRestoreAll(true)}
                >
                  Recuperar todos
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm notifications-center-danger"
                  disabled={busy || items.length === 0}
                  onClick={() => setConfirmEmptyTrash(true)}
                >
                  <Icon name="trash" size={16} />
                  Esvaziar lixeira
                </button>
                <p className="notifications-center-trash-hint">
                  Recupere itens para a aba Lidas, ou esvazie para apagar de forma definitiva.
                </p>
              </>
            ) : null}
          </div>

          <div className="notifications-center-body">
            <div className="notifications-center-list" role="tabpanel">
              {loading && items.length === 0 ? (
                <p className="notifications-center-empty">Carregando…</p>
              ) : null}
              {!loading && items.length === 0 ? (
                <p className="notifications-center-empty">{emptyMessages[tab]}</p>
              ) : null}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notifications-center-list-item${selected?.id === n.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(n.id)}
                >
                  <NotificationListItem notification={n} compact />
                </button>
              ))}
            </div>

            <aside className="notifications-center-detail">
              {selected ? (
                <>
                  <NotificationListItem notification={selected} />
                  <dl className="notifications-center-meta">
                    <div>
                      <dt>Tipo</dt>
                      <dd>{notificationTypeLabel(selected.type)}</dd>
                    </div>
                    <div>
                      <dt>Etapa / destino</dt>
                      <dd>{notificationStageLabel(selected) ?? '—'}</dd>
                    </div>
                    {selected.request?.code ? (
                      <div>
                        <dt>Solicitação</dt>
                        <dd>{selected.request.code}</dd>
                      </div>
                    ) : null}
                    {selected.request?.requester?.name ? (
                      <div>
                        <dt>Solicitante</dt>
                        <dd>{selected.request.requester.name}</dd>
                      </div>
                    ) : null}
                    {selected.request?.state ? (
                      <div>
                        <dt>Etapa atual</dt>
                        <dd>{requestStateLabel(selected.request.state)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Recebida em</dt>
                      <dd>{formatRequestDate(selected.createdAt)}</dd>
                    </div>
                    {selected.readAt ? (
                      <div>
                        <dt>Lida em</dt>
                        <dd>{formatRequestDate(selected.readAt)}</dd>
                      </div>
                    ) : null}
                    {selected.trashedAt ? (
                      <div>
                        <dt>Arquivada em</dt>
                        <dd>{formatRequestDate(selected.trashedAt)}</dd>
                      </div>
                    ) : null}
                    {selected.linkUrl ? (
                      <div>
                        <dt>Destino</dt>
                        <dd>
                          <Link to={selected.linkUrl} onClick={() => onClose()}>
                            Abrir solicitação
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="notifications-center-actions">
                    {tab !== 'trash' && selected.linkUrl ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => void openNotification(selected)}
                      >
                        Abrir solicitação
                      </button>
                    ) : null}
                    {tab === 'unread' ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void runAction(() => notificationsApi.markRead(selected.id))
                        }
                      >
                        Marcar como lida
                      </button>
                    ) : null}
                    {tab === 'read' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busy}
                          onClick={() =>
                            void runAction(() => notificationsApi.markUnread(selected.id))
                          }
                        >
                          Marcar como não lida
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busy}
                          onClick={() => setConfirmTrashOne(true)}
                        >
                          <Icon name="trash" size={16} />
                          Arquivar na lixeira
                        </button>
                      </>
                    ) : null}
                    {tab === 'trash' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() => setConfirmRestoreOne(true)}
                        >
                          Recuperar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm notifications-center-danger"
                          disabled={busy}
                          onClick={() => setConfirmDeleteOne(true)}
                        >
                          <Icon name="x" size={16} />
                          Excluir permanentemente
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="notifications-center-empty">
                  Selecione uma notificação para ver os detalhes.
                </p>
              )}
            </aside>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmTrashAllRead}
        title="Arquivar todas as lidas"
        message="Todas as notificações lidas serão movidas para a lixeira. Você poderá recuperá-las depois na aba Lixeira."
        confirmLabel="Arquivar todas"
        onConfirm={() => {
          setConfirmTrashAllRead(false);
          void runAction(() => notificationsApi.trashAllRead());
        }}
        onCancel={() => setConfirmTrashAllRead(false)}
      />

      <ConfirmDialog
        open={confirmTrashOne}
        title="Arquivar na lixeira"
        message="Esta notificação será movida para a lixeira. Você poderá recuperá-la depois."
        confirmLabel="Arquivar"
        onConfirm={() => {
          const id = selected?.id;
          setConfirmTrashOne(false);
          if (!id) return;
          void runAction(() => notificationsApi.trashOne(id));
        }}
        onCancel={() => setConfirmTrashOne(false)}
      />

      <ConfirmDialog
        open={confirmRestoreOne}
        title="Recuperar notificação"
        message="Esta notificação voltará para a aba Lidas."
        confirmLabel="Recuperar"
        onConfirm={() => {
          const id = selected?.id;
          setConfirmRestoreOne(false);
          if (!id) return;
          void runAction(() => notificationsApi.restoreOne(id));
        }}
        onCancel={() => setConfirmRestoreOne(false)}
      />

      <ConfirmDialog
        open={confirmRestoreAll}
        title="Recuperar todos da lixeira"
        message="Todas as notificações da lixeira voltarão para a aba Lidas."
        confirmLabel="Recuperar todos"
        onConfirm={() => {
          setConfirmRestoreAll(false);
          void runAction(() => notificationsApi.restoreAll());
        }}
        onCancel={() => setConfirmRestoreAll(false)}
      />

      <ConfirmDialog
        open={confirmEmptyTrash}
        title="Esvaziar lixeira"
        message="Atenção: todas as notificações da lixeira vão sumir de forma permanente e não poderão ser recuperadas. Deseja continuar?"
        confirmLabel="Esvaziar permanentemente"
        onConfirm={() => {
          setConfirmEmptyTrash(false);
          void runAction(() => notificationsApi.emptyTrash());
        }}
        onCancel={() => setConfirmEmptyTrash(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOne}
        title="Excluir notificação"
        message="Atenção: esta notificação vai sumir de forma permanente e não poderá ser recuperada. Deseja continuar?"
        confirmLabel="Excluir permanentemente"
        onConfirm={() => {
          const id = selected?.id;
          setConfirmDeleteOne(false);
          if (!id) return;
          void runAction(() => notificationsApi.deleteTrashedOne(id));
        }}
        onCancel={() => setConfirmDeleteOne(false)}
      />
    </>
  );
}
