import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { NotificationListItem } from './NotificationListItem';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import { notificationsApi, type NotificationListStatus } from '../lib/resources';
import type { Notification } from '../lib/types';
import './NotificationsBell.css';

const POLL_MS = 30_000;

type PanelTab = 'unread' | 'read';

/**
 * Sininho da topbar: badge + painel rápido (Não lidas / Lidas).
 * Lixeira e gestão completa ficam na central de notificações.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<NotificationListStatus>('unread');
  const [tab, setTab] = useState<PanelTab>('unread');
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmTrashAllRead, setConfirmTrashAllRead] = useState(false);
  const [confirmTrashOneId, setConfirmTrashOneId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await notificationsApi.count();
      setUnread(typeof count === 'number' ? count : Number(count) || 0);
    } catch {
      /* silencioso */
    }
  }, []);

  const refreshList = useCallback(async (status: PanelTab) => {
    try {
      const list = await notificationsApi.list(status);
      setItems(list);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void Promise.all([refreshCount(), refreshList(tab)]).finally(() => setLoading(false));
  }, [open, tab, refreshCount, refreshList]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openCenter(nextTab: NotificationListStatus = 'unread') {
    setOpen(false);
    setCenterTab(nextTab);
    setCenterOpen(true);
  }

  async function markAll() {
    await notificationsApi.markAllRead();
    await Promise.all([refreshCount(), refreshList(tab)]);
  }

  async function markOneAsRead(n: Notification, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (n.readAt || actionId) return;
    setActionId(n.id);
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.filter((item) => item.id !== n.id));
      await refreshCount();
    } finally {
      setActionId(null);
    }
  }

  async function trashOne(n: Notification, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!n.readAt || actionId) return;
    setConfirmTrashOneId(n.id);
  }

  async function confirmTrashOne() {
    const id = confirmTrashOneId;
    setConfirmTrashOneId(null);
    if (!id) return;
    setActionId(id);
    try {
      await notificationsApi.trashOne(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível arquivar a notificação.');
    } finally {
      setActionId(null);
    }
  }

  async function trashAllRead() {
    setConfirmTrashAllRead(false);
    try {
      await notificationsApi.trashAllRead();
      setItems([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível arquivar as lidas.');
    }
  }

  async function openItem(n: Notification) {
    if (!n.readAt) {
      await notificationsApi.markRead(n.id);
      await refreshCount();
    }
    setOpen(false);
  }

  const emptyMessage =
    tab === 'unread' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação lida ainda.';

  const hint =
    tab === 'unread'
      ? 'Clique na notificação para abrir a solicitação. Use o olho para marcar só aquela como lida.'
      : 'Use o X para arquivar uma lida na lixeira. A lixeira é gerenciada na central de notificações.';

  return (
    <>
      <div className="notifications-bell" ref={rootRef}>
        <button
          type="button"
          className={`topbar-notifications${open ? ' topbar-notifications--open' : ''}`}
          title="Notificações"
          aria-label="Notificações"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="bell" size={20} />
          {unread > 0 ? (
            <span className="notifications-bell-badge" aria-label={`${unread} não lidas`}>
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="notifications-panel" role="dialog" aria-label="Notificações">
            <header className="notifications-panel-header">
              <strong>Notificações</strong>
            </header>

            <div className="notifications-panel-tabs" role="tablist" aria-label="Filtro de notificações">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'unread'}
                className={`notifications-panel-tab${tab === 'unread' ? ' is-active' : ''}`}
                onClick={() => setTab('unread')}
              >
                Não lidas
                {unread > 0 ? (
                  <span className="notifications-panel-tab-count">{unread}</span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'read'}
                className={`notifications-panel-tab${tab === 'read' ? ' is-active' : ''}`}
                onClick={() => setTab('read')}
              >
                Lidas
              </button>
            </div>

            <p className="notifications-panel-hint">{hint}</p>

            <div className="notifications-panel-list" role="tabpanel">
              {loading && items.length === 0 ? (
                <p className="notifications-panel-empty">Carregando…</p>
              ) : null}
              {!loading && items.length === 0 ? (
                <p className="notifications-panel-empty">{emptyMessage}</p>
              ) : null}
              {items.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={`notifications-panel-row${isUnread ? ' is-unread' : ''}`}
                  >
                    <Link
                      to={n.linkUrl || '/produtos/caixa-de-entrada'}
                      className="notifications-panel-item"
                      onClick={() => void openItem(n)}
                    >
                      <NotificationListItem notification={n} compact />
                    </Link>
                    {isUnread ? (
                      <button
                        type="button"
                        className="notifications-panel-mark"
                        title="Marcar como lida"
                        aria-label={`Marcar como lida: ${n.title}`}
                        disabled={actionId === n.id}
                        onClick={(e) => void markOneAsRead(n, e)}
                      >
                        <Icon name="eye" size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="notifications-panel-mark notifications-panel-mark--remove"
                        title="Arquivar na lixeira"
                        aria-label={`Arquivar na lixeira: ${n.title}`}
                        disabled={actionId === n.id}
                        onClick={(e) => void trashOne(n, e)}
                      >
                        <Icon name="x" size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <footer className="notifications-panel-footer">
              {tab === 'unread' && unread > 0 ? (
                <button type="button" className="btn-link" onClick={() => void markAll()}>
                  Marcar todas como lidas
                </button>
              ) : null}
              {tab === 'read' && items.length > 0 ? (
                <button
                  type="button"
                  className="btn-link notifications-panel-trash-all"
                  onClick={() => setConfirmTrashAllRead(true)}
                >
                  <Icon name="trash" size={14} />
                  Arquivar todas as lidas
                </button>
              ) : null}
              <button
                type="button"
                className="btn-link"
                onClick={() => openCenter(tab)}
              >
                Ver todas as notificações
              </button>
            </footer>
          </div>
        ) : null}
      </div>

      <NotificationsCenterModal
        open={centerOpen}
        initialTab={centerTab}
        onClose={() => setCenterOpen(false)}
        onCountsChange={() => void refreshCount()}
      />

      <ConfirmDialog
        open={confirmTrashAllRead}
        title="Arquivar todas as lidas"
        message="Todas as notificações lidas serão movidas para a lixeira. Para recuperá-las ou esvaziar, use a central de notificações."
        confirmLabel="Arquivar todas"
        onConfirm={() => void trashAllRead()}
        onCancel={() => setConfirmTrashAllRead(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmTrashOneId)}
        title="Arquivar na lixeira"
        message="Esta notificação será movida para a lixeira. Você poderá recuperá-la na central de notificações."
        confirmLabel="Arquivar"
        onConfirm={() => void confirmTrashOne()}
        onCancel={() => setConfirmTrashOneId(null)}
      />
    </>
  );
}
