import { DataTable } from '../../components/DataTable';
import { PaginationBar } from '../../components/PaginationBar';
import { useEffect, useState } from 'react';
import { suppliersApi } from '../../lib/resources';
import type { Supplier, SupplierRequest } from '../../lib/types';

function useSuppliers(mode: 'base' | 'inactive' | 'requests', mine = false) {
  const [rows, setRows] = useState<(Supplier | SupplierRequest)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  async function load(p = 1) {
    if (mode === 'base') {
      const r = await suppliersApi.base({ page: p });
      setRows(r.data); setTotal(r.total); setPage(r.page);
    } else if (mode === 'inactive') {
      const r = await suppliersApi.inactive(p);
      setRows(r.data); setTotal(r.total); setPage(r.page);
    } else {
      const r = await suppliersApi.requests({ mine, page: p });
      setRows(r.data); setTotal(r.total); setPage(r.page);
    }
  }

  useEffect(() => { void load(); }, [mode, mine]);

  return { rows, total, page, load };
}

export function NovaSolicitacaoFornecedorPage() {
  return (
    <section>
      <h1 className="module-title">NOVA SOLICITAÇÃO DE FORNECEDOR</h1>
      <p className="info-banner">Protótipo AS-IS: apenas Pessoa Jurídica (CNPJ).</p>
      <div className="form-field">
        <label>CNPJ *</label>
        <input placeholder="00.000.000/0000-00" />
      </div>
      <button type="button" className="btn btn-primary">Iniciar solicitação</button>
    </section>
  );
}

export function FornecedoresBasePage() {
  const { rows, total, page, load } = useSuppliers('base');
  return (
    <section>
      <h1 className="module-title">BASE DE FORNECEDORES</h1>
      <DataTable rows={rows as Supplier[]} rowKey={(r) => r.id} columns={[
        { key: 'doc', header: 'CNPJ', render: (r) => r.document },
        { key: 'name', header: 'Razão Social', render: (r) => r.corporateName },
        { key: 'origin', header: 'Origem', render: (r) => r.originBase },
      ]} />
      <PaginationBar page={page} pageSize={20} total={total} onChange={(p) => void load(p)} />
    </section>
  );
}

export function FornecedoresInativosPage() {
  const { rows, total, page, load } = useSuppliers('inactive');
  return (
    <section>
      <h1 className="module-title">FORNECEDORES INATIVOS</h1>
      <DataTable rows={rows as Supplier[]} rowKey={(r) => r.id} columns={[
        { key: 'doc', header: 'CNPJ', render: (r) => r.document },
        { key: 'name', header: 'Razão Social', render: (r) => r.corporateName },
      ]} />
      <PaginationBar page={page} pageSize={20} total={total} onChange={(p) => void load(p)} />
    </section>
  );
}

export function FornecedoresCaixaPage() {
  const { rows, total, page, load } = useSuppliers('requests');
  return (
    <section>
      <h1 className="module-title">CAIXA DE ENTRADA — FORNECEDORES</h1>
      <DataTable rows={rows as SupplierRequest[]} rowKey={(r) => r.id} columns={[
        { key: 'doc', header: 'CNPJ', render: (r) => r.document },
        { key: 'state', header: 'Etapa', render: (r) => r.state },
        { key: 'req', header: 'Solicitante', render: (r) => r.requester?.name ?? '—' },
      ]} />
      <PaginationBar page={page} pageSize={20} total={total} onChange={(p) => void load(p)} />
    </section>
  );
}

export function FornecedoresTodasPage() {
  return <FornecedoresCaixaPage />;
}

export function FornecedoresMinhasPage() {
  const { rows, total, page, load } = useSuppliers('requests', true);
  return (
    <section>
      <h1 className="module-title">MINHAS SOLICITAÇÕES — FORNECEDORES</h1>
      <DataTable rows={rows as SupplierRequest[]} rowKey={(r) => r.id} columns={[
        { key: 'doc', header: 'CNPJ', render: (r) => r.document },
        { key: 'state', header: 'Etapa', render: (r) => r.state },
      ]} />
      <PaginationBar page={page} pageSize={20} total={total} onChange={(p) => void load(p)} />
    </section>
  );
}
