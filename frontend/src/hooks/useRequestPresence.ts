import { useEffect, useState } from 'react';
import { leaveRequestPresenceKeepalive } from '../lib/api';
import { requestsApi } from '../lib/resources';
import type { RequestViewer } from '../lib/types';

const HEARTBEAT_MS = 15_000;

export type RequestPresenceState = {
  viewers: RequestViewer[];
  /** Quem chegou primeiro e pode editar. */
  editor: RequestViewer | null;
};

/**
 * Marca o usuário como visualizando a solicitação (heartbeat) e
 * devolve viewers + editor (primeiro a chegar detém a análise).
 */
export function useRequestPresence(requestId: string | undefined): RequestPresenceState {
  const [viewers, setViewers] = useState<RequestViewer[]>([]);
  const [editor, setEditor] = useState<RequestViewer | null>(null);

  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;

    function beat() {
      void requestsApi
        .heartbeatPresence(requestId!)
        .then((res) => {
          if (cancelled) return;
          setViewers(res.viewers);
          setEditor(res.editor ?? null);
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

  return { viewers, editor };
}
