import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { hasCap } from '../lib/capabilities';
import './produtos/produtos.css';

/** Landing inicial do portal — ponto de entrada após login. */
export function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';
  const canProducts = hasCap(user, 'products.module');
  const canCreate = hasCap(user, 'products.request.create');
  const canSuppliers = hasCap(user, 'suppliers.module');
  const canParams = hasCap(user, 'catalog.params') || hasCap(user, 'users.manage');
  const paramsTo = hasCap(user, 'catalog.params')
    ? '/parametrizacoes/produtos'
    : '/parametrizacoes/administrativo';

  return (
    <section className="home-page">
      <div className="home-hero">
        <p className="home-greeting">Olá, {firstName}.</p>
        <h1 className="home-welcome">Seja bem-vindo!</h1>
        <p className="home-lead">
          Portal de Cadastro & Solicitação da Amarante — substitui o fluxo de itens do Semplice
          e centraliza cadastros de produtos e fornecedores com prevenção de duplicidade.
        </p>
      </div>

      <div className="hub-section">
        <h2 className="module-title">Módulos</h2>
        <div className="tile-grid">
          {canProducts ? (
            <Link to="/produtos" className="tile">
              <strong>Produtos</strong>
              <span>Solicitações, fila e base unificada</span>
            </Link>
          ) : null}
          {canSuppliers ? (
            <Link to="/fornecedores" className="tile">
              <strong>Fornecedores</strong>
              <span>Cadastro e consulta por CNPJ</span>
            </Link>
          ) : null}
          {canParams ? (
            <Link to={paramsTo} className="tile">
              <strong>Parametrizações</strong>
              <span>Hotéis, famílias, grupos e unidades</span>
            </Link>
          ) : null}
        </div>
      </div>

      {canProducts ? (
        <div className="hub-section">
          <h2 className="module-title">Acesso rápido</h2>
          <div className="tile-grid">
            {canCreate ? (
              <Link to="/produtos/nova-solicitacao" className="tile">
                Nova solicitação de produto
              </Link>
            ) : null}
            <Link to="/produtos/caixa-de-entrada" className="tile">
              Caixa de entrada — produtos
            </Link>
            <Link to="/produtos/solicitacoes" className="tile">
              Solicitações — histórico completo
            </Link>
            <Link to="/produtos/base" className="tile">
              Base de produtos
            </Link>
          </div>
        </div>
      ) : null}

      <div className="hub-section">
        <h2 className="module-title">Apoio</h2>
        <div className="tile-grid">
          <Link to="/suporte" className="tile">
            Suporte
          </Link>
          <Link to="/faq" className="tile">
            FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
