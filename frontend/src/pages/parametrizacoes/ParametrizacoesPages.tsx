import { useEffect, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { catalogApi } from '../../lib/resources';
import type { Family } from '../../lib/types';
import '../produtos/produtos.css';

type Tab = 'hotels' | 'warehouses' | 'families' | 'groups' | 'subgroups' | 'units';

export function ParametrizacoesProdutosPage() {
  const [tab, setTab] = useState<Tab>('families');
  const [families, setFamilies] = useState<Family[]>([]);
  const [generic, setGeneric] = useState<{ id: string; code: string; name: string }[]>([]);

  useEffect(() => {
    if (tab === 'families') {
      void catalogApi.families({ pageSize: 100 }).then((r) => setFamilies(r.data));
    } else if (tab === 'hotels') {
      void catalogApi.hotels().then((h) => setGeneric(h.map((x) => ({ id: x.id, code: x.code, name: x.name }))));
    } else if (tab === 'groups') {
      void catalogApi.groups().then((r) => setGeneric(r.data));
    } else if (tab === 'subgroups') {
      void catalogApi.subgroups().then((r) => setGeneric(r.data));
    } else if (tab === 'units') {
      void catalogApi.measureUnits().then((r) => setGeneric(r.data));
    } else if (tab === 'warehouses') {
      void catalogApi.warehouses().then((r) => setGeneric(r.data));
    }
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hotels', label: 'Hotéis' },
    { id: 'warehouses', label: 'Armazéns' },
    { id: 'families', label: 'Famílias' },
    { id: 'groups', label: 'Grupos' },
    { id: 'subgroups', label: 'Sub Grupos' },
    { id: 'units', label: 'Unidade Medida' },
  ];

  return (
    <section>
      <h1 className="module-title">PARAMETRIZAÇÕES — PRODUTOS</h1>
      <div className="param-tabs">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`param-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'families' ? (
        <DataTable rows={families} rowKey={(r) => r.id} columns={[
          { key: 'name', header: 'Nome', render: (r) => r.name },
          { key: 'code', header: 'Código', render: (r) => r.code },
          { key: 'sub', header: 'Subgrupo', render: (r) => `${r.subgroupCode} — ${r.subgroupName}` },
          { key: 'grp', header: 'Grupo', render: (r) => `${r.groupCode} — ${r.groupName}` },
          { key: 'attr', header: 'Atributos', render: (r) => r.attributesCount ?? 0 },
        ]} />
      ) : (
        <DataTable rows={generic} rowKey={(r) => r.id} columns={[
          { key: 'name', header: 'Nome', render: (r) => r.name },
          { key: 'code', header: 'Código', render: (r) => r.code },
        ]} />
      )}
      <button type="button" className="btn btn-primary" style={{ marginTop: 16 }}>Cadastrar</button>
    </section>
  );
}

export function ParametrizacoesAdminPage() {
  return (
    <section>
      <h1 className="module-title">PARAMETRIZAÇÕES — ADMINISTRATIVO</h1>
      <p className="info-banner">Usuários e perfis — CRUD padrão Prottus (referência prints administrativo).</p>
    </section>
  );
}
