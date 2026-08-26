import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../lib/resources';
import type { DashboardProductsSummary } from '../../lib/types';
import './produtos.css';

export function ProdutosDashboardPage() {
  const [summary, setSummary] = useState<DashboardProductsSummary | null>(null);

  useEffect(() => {
    void dashboardApi.products().then(setSummary).catch(console.error);
  }, []);

  return (
    <section>
      <h1 className="module-title">PRODUTOS — DASHBOARD</h1>
      <div className="summary-grid">
        <div className="summary-card">
          <span>Caixa de entrada</span>
          <strong>{summary?.inbox ?? '—'}</strong>
        </div>
        <div className="summary-card">
          <span>SLA vencidos</span>
          <strong className="text-danger">{summary?.slaOverdue ?? '—'}</strong>
        </div>
        <div className="summary-card">
          <span>Produtos ativos</span>
          <strong>{summary?.products ?? '—'}</strong>
        </div>
        <div className="summary-card">
          <span>Famílias</span>
          <strong>{summary?.families ?? '—'}</strong>
        </div>
      </div>
      {summary && summary.inbox > 0 ? (
        <p className="info-banner">
          {Math.round(summary.slaOverdueRatio * 100)}% da fila com SLA vencido — meta: reduzir duplicidade e fila poluída.
        </p>
      ) : null}
      <div className="hub-section">
        <h2 className="module-title">Ações rápidas</h2>
        <div className="tile-grid">
          <Link to="/produtos/nova-solicitacao" className="tile">
            Nova Solicitação
          </Link>
          <Link to="/produtos/caixa-de-entrada" className="tile">
            Caixa de Entrada
          </Link>
          <Link to="/produtos/solicitacoes" className="tile">
            Solicitações
          </Link>
          <Link to="/produtos/base" className="tile">
            Base de Produtos
          </Link>
        </div>
      </div>
    </section>
  );
}
