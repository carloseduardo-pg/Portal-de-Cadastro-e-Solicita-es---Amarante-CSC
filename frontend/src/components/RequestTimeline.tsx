import {
  formatRequestDate,
  requestStateColor,
  requestStateLabel,
  stageTint,
} from '../lib/requestLabels';
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

/** Momento do acontecimento: conclusão se houver; senão início da etapa. */
function eventAt(stage: RequestStage) {
  return stage.finishedAt ?? stage.startedAt;
}

/**
 * Log visual das etapas — mais recente primeiro.
 * Data/hora amarela na linha do bullet; bloco tingido com a cor da tag da etapa.
 */
export function RequestTimeline({ stages }: RequestTimelineProps) {
  if (!stages.length) return null;

  const ordered = [...stages].sort((a, b) => {
    const tb = new Date(eventAt(b)).getTime();
    const ta = new Date(eventAt(a)).getTime();
    if (tb !== ta) return tb - ta;
    if (!a.finishedAt && b.finishedAt) return -1;
    if (a.finishedAt && !b.finishedAt) return 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return (
    <section className="request-timeline" aria-label="Timeline da solicitação">
      <h2 className="form-section-title">Timeline</h2>
      <ol className="request-timeline-list">
        {ordered.map((s) => {
          const waiting = !s.finishedAt;
          const isReclassify =
            s.outcome === 'RECLASSIFY_FIXED_ASSET' ||
            s.outcome === 'RECLASSIFY_CONSUMPTION';
          const isApproval =
            s.outcome === 'APPROVAL_TOTAL' || s.outcome === 'APPROVAL_PARTIAL';
          const isClosed = s.outcome === 'CLOSED';
          const detail = s.outcomeDetail;
          const when = formatRequestDate(eventAt(s));
          const color = requestStateColor(s.stage);
          return (
            <li key={s.id} className="request-timeline-item">
              <div className="request-timeline-marker">
                <span
                  className="request-timeline-dot"
                  aria-hidden
                  style={{
                    background: color,
                    boxShadow: `0 0 0 1px ${color}`,
                  }}
                />
                <time
                  className="request-timeline-when"
                  dateTime={eventAt(s)}
                  title={
                    waiting
                      ? `Iniciado em ${formatRequestDate(s.startedAt)}`
                      : `Concluído em ${formatRequestDate(s.finishedAt)}`
                  }
                >
                  {when}
                </time>
              </div>
              <div
                className="request-timeline-card"
                style={{
                  borderColor: color,
                  borderTopColor: color,
                  background: stageTint(color, 12),
                }}
              >
                <p className="request-timeline-stage" style={{ color }}>
                  {requestStateLabel(s.stage)}
                  {isReclassify ? (
                    <span className="request-timeline-badge">Reclassificação</span>
                  ) : null}
                  {isClosed ? (
                    <span className="request-timeline-badge">Encerramento</span>
                  ) : null}
                </p>
                {s.user?.name ? (
                  <p>
                    <strong>Usuário:</strong> {s.user.name}
                  </p>
                ) : null}
                {waiting ? (
                  <p className="request-timeline-waiting" style={{ color }}>
                    Aguardando conclusão
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>Houve atraso:</strong> {s.isLate ? 'Sim' : 'Não'}
                    </p>
                    {isClosed && (detail?.reasonLabel || detail?.observation) ? (
                      <div className="request-timeline-reclassify">
                        {detail.reasonLabel ? (
                          <p>
                            <strong>Motivo:</strong> {detail.reasonLabel}
                          </p>
                        ) : null}
                        {detail.observation ? (
                          <p>
                            <strong>Observação:</strong> {detail.observation}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {isApproval ? (
                      <div className="request-timeline-reclassify">
                        <p>
                          <strong>Tipo:</strong>{' '}
                          {s.outcome === 'APPROVAL_PARTIAL'
                            ? 'Aprovação parcial'
                            : 'Aprovação total'}
                          {detail?.approvedCount != null
                            ? ` — ${detail.approvedCount} aprovado(s)`
                            : ''}
                          {detail?.rejectedCount
                            ? `, ${detail.rejectedCount} rejeitado(s)`
                            : ''}
                        </p>
                        {detail?.itemsApproved?.length ? (
                          <>
                            <p>
                              <strong>Itens na base:</strong>
                            </p>
                            <ul className="request-timeline-reclassify-items">
                              {detail.itemsApproved.map((it) => (
                                <li key={it.id}>{it.descriptionShort}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {detail?.itemsRejected?.length ? (
                          <>
                            <p>
                              <strong>Itens rejeitados:</strong>
                            </p>
                            <ul className="request-timeline-reclassify-items">
                              {detail.itemsRejected.map((it) => (
                                <li key={it.id}>{it.descriptionShort}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    ) : null}
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
                            <strong>Retorno ao aprovador - administrativo:</strong>{' '}
                            {detail.returnToApprover
                              ? 'Sim — volta ao Aprovador - Administrativo após o Aprovador - Imobilizado'
                              : 'Não — Aprovador - Imobilizado conclui sozinho'}
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
