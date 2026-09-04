import { useEffect, useState } from 'react';
import { leaveRequestPresenceKeepalive } from '../lib/api';
import { requestsApi } from '../lib/resources';
import type { RequestViewer } from '../lib/types';

const HEARTBEAT_MS = 15_000;

/**
 * Marca o usuário como visualizando a solicitação (heartbeat) e
 * devolve a lista atualizada de viewers para os outros usuários.
 */
export function useRequestPresence(requestId: string | undefined) {
  const [viewers, setViewers] = useState<RequestViewer[]>([]);

  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;

    function beat() {
      void requestsApi
        .heartbeatPresence(requestId!)
        .then((res) => {
          if (!cancelled) setViewers(res.viewers);
        })
        .catch(() => undefined);
    }

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);

    function leave() {
      leaveRequestPresenceKeepalive(requestId!);
    }

    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
      leave();
    };
  }, [requestId]);

  return viewers;
}
