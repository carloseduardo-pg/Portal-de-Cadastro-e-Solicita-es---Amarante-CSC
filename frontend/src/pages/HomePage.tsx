import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './produtos/produtos.css';

/** Landing inicial do portal — ponto de entrada após login. */
export function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';

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
          <Link to="/produtos" className="tile">
            <strong>Produtos</strong>
            <span>Solicitações, fila e base unificada</span>
          </Link>
          <Link to="/fornecedores" className="tile">
            <strong>Fornecedores</strong>
            <span>Cadastro e consulta por CNPJ</span>
          </Link>
          <Link to="/parametrizacoes/produtos" className="tile">
            <strong>Parametrizações</strong>
            <span>Hotéis, famílias, grupos e unidades</span>
          </Link>
        </div>
      </div>

      <div className="hub-section">
        <h2 className="module-title">Acesso rápido</h2>
        <div className="tile-grid">
          <Link to="/produtos/nova-solicitacao" className="tile">
            Nova solicitação de produto
          </Link>
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
