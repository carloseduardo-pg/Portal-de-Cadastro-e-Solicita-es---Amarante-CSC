import { formatRequestDate, requestStateLabel } from '../lib/requestLabels';
import type { RequestStage, RequestStageOutcomeDetail } from '../lib/types';
import './RequestTimeline.css';

type RequestTimelineProps = {
  stages: RequestStage[];
};

function kindLabel(kind?: string) {
  if (kind === 'FIXED_ASSET') return 'Ativo fixo';
  if (kind === 'CONSUMPTION') return 'Uso e consumo';
  return kind ?? '—';
}

function reclassifySummary(outcome: string, detail?: RequestStageOutcomeDetail | null) {
  const before = detail?.itemsBefore?.[0]?.itemKind;
  const after = detail?.itemsAfter?.[0]?.itemKind;
  const fromTo =
    before || after
      ? `${kindLabel(before)} → ${kindLabel(after)}`
      : outcome === 'RECLASSIFY_FIXED_ASSET'
        ? 'Uso e consumo → Ativo fixo'
        : 'Ativo fixo → Uso e consumo';
  return fromTo;
}

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
          const isReclassify =
            s.outcome === 'RECLASSIFY_FIXED_ASSET' ||
            s.outcome === 'RECLASSIFY_CONSUMPTION';
          const detail = s.outcomeDetail;
          return (
            <li key={s.id} className="request-timeline-item">
              <span className="request-timeline-dot" aria-hidden />
              <div className="request-timeline-card">
                <p className="request-timeline-stage">
                  {requestStateLabel(s.stage)}
                  {isReclassify ? (
                    <span className="request-timeline-badge">Reclassificação</span>
                  ) : null}
                </p>
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
                    {isReclassify ? (
                      <div className="request-timeline-reclassify">
                        <p>
                          <strong>Tipo:</strong> {reclassifySummary(s.outcome!, detail)}
                        </p>
                        {detail?.split ? (
                          <p>
                            <strong>Divisão de lote:</strong> solicitação{' '}
                            {detail.parentRequestId === undefined
                              ? '—'
                              : detail.childRequestId
                                ? `${detail.parentRequestId.slice(0, 8)}… → ${detail.childRequestId.slice(0, 8)}…`
                                : detail.parentRequestId.slice(0, 8) + '…'}
                          </p>
                        ) : null}
                        {(detail?.itemsAfter ?? detail?.itemsBefore)?.length ? (
                          <ul className="request-timeline-reclassify-items">
                            {(detail?.itemsAfter ?? detail?.itemsBefore ?? []).map((it) => (
                              <li key={it.id}>{it.descriptionShort}</li>
                            ))}
                          </ul>
                        ) : null}
                        {s.outcome === 'RECLASSIFY_FIXED_ASSET' &&
                        detail?.returnToApprover !== undefined ? (
                          <p>
                            <strong>Retorno ao aprovador:</strong>{' '}
                            {detail.returnToApprover
                              ? 'Sim — volta ao Aprovador após o Imobilizado'
                              : 'Não — Imobilizado conclui sozinho'}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {s.message?.trim() ? (
                      <div className="request-timeline-message">
                        <p className="request-timeline-message-label">
                          {isReclassify
                            ? 'Justificativa da reclassificação:'
                            : 'Mensagem do usuário ao concluir etapa:'}
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
