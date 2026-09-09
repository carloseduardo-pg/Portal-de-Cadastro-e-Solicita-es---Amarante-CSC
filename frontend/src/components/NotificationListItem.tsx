import {
  coloredFlagStyle,
  notificationShowsTypeBadge,
  notificationStageColor,
  notificationStageLabel,
  notificationTypeColor,
  notificationTypeLabel,
  parseNotificationTitle,
} from '../lib/notificationLabels';
import type { Notification } from '../lib/types';

type Props = {
  notification: Notification;
  compact?: boolean;
};

/**
 * Resumo de uma notificação com flags coloridas (etapa, tipo).
 * Reutilizado no sininho e na central de notificações.
 */
export function NotificationListItem({ notification: n, compact = false }: Props) {
  const { headline } = parseNotificationTitle(n.title);
  const stageLabel = notificationStageLabel(n);
  const stageColor = notificationStageColor(n);
  const showType = notificationShowsTypeBadge(n);

  return (
    <div className={`notification-list-item${compact ? ' notification-list-item--compact' : ''}`}>
      <div className="notification-list-item-head">
        <strong className="notification-list-item-title">{headline}</strong>
        <div className="notification-list-item-flags">
          {stageLabel ? (
            <span
              className="notification-flag notification-flag--stage"
              style={coloredFlagStyle(stageColor)}
            >
              {stageLabel}
            </span>
          ) : null}
          {showType ? (
            <span
              className="notification-flag notification-flag--type"
              style={coloredFlagStyle(notificationTypeColor(n.type))}
            >
              {notificationTypeLabel(n.type)}
            </span>
          ) : null}
        </div>
      </div>
      {n.body ? <span className="notification-list-item-body">{n.body}</span> : null}
      <time className="notification-list-item-time" dateTime={n.createdAt}>
        {new Date(n.createdAt).toLocaleString('pt-BR')}
      </time>
    </div>
  );
}
