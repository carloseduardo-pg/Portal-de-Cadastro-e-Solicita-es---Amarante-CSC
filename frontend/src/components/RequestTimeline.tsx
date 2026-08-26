import { formatRequestDate, requestStateLabel } from '../lib/requestLabels';
import type { RequestStage } from '../lib/types';
import './RequestTimeline.css';

type RequestTimelineProps = {
  stages: RequestStage[];
};

/**
 * Log visual das etapas da solicitação (rascunho → … → encerrado).
 */
export function RequestTimeline({ stages }: RequestTimelineProps) {
  if (!stages.length) return null;

  const ordered = [...stages].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  return (
    <section className="request-timeline" aria-label="Timeline da solicitação">
      <h2 className="form-section-title">Timeline</h2>
      <ol className="request-timeline-list">
        {ordered.map((s) => {
          const waiting = !s.finishedAt;
          return (
            <li key={s.id} className="request-timeline-item">
              <span className="request-timeline-dot" aria-hidden />
              <div className="request-timeline-card">
                <p className="request-timeline-stage">{requestStateLabel(s.stage)}</p>
                {s.user?.name ? (
                  <p>
                    <strong>Usuário:</strong> {s.user.name}
                  </p>
                ) : null}
                <p>
                  <strong>Iniciado em:</strong> {formatRequestDate(s.startedAt)}
                </p>
                {waiting ? (
                  <p className="request-timeline-waiting">Aguardando conclusão</p>
                ) : (
                  <>
                    <p>
                      <strong>Concluído em:</strong> {formatRequestDate(s.finishedAt)}
                    </p>
                    <p>
                      <strong>Houve atraso:</strong> {s.isLate ? 'Sim' : 'Não'}
                    </p>
                    {s.message?.trim() ? (
                      <div className="request-timeline-message">
                        <p className="request-timeline-message-label">
                          Mensagem do usuário ao concluir etapa:
                        </p>
                        <p>{s.message}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
