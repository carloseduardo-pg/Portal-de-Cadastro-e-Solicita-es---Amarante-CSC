import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersApi } from '../../lib/resources';

export function FornecedoresDashboardPage() {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  useEffect(() => { void suppliersApi.summary().then(setSummary); }, []);

  return (
    <section>
      <h1 className="module-title">FORNECEDORES — DASHBOARD</h1>
      <div className="summary-grid">
        <div className="summary-card"><span>Ativos</span><strong>{summary?.active ?? '—'}</strong></div>
        <div className="summary-card"><span>Caixa de entrada</span><strong>{summary?.inbox ?? '—'}</strong></div>
      </div>
      <p className="info-banner">
        Fase 2: CPF, órgão público, internacional e compliance — ver PRD Parte V.
      </p>
      <div className="tile-grid">
        <Link to="/fornecedores/nova-solicitacao" className="tile">Nova Solicitação (CNPJ)</Link>
        <Link to="/fornecedores/base" className="tile">Base</Link>
      </div>
    </section>
  );
}
