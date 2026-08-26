import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ProdutosDashboardPage } from './pages/produtos/ProdutosDashboardPage';
import { NovaSolicitacaoPage } from './pages/produtos/NovaSolicitacaoPage';
import { DadosDoItemPage } from './pages/produtos/DadosDoItemPage';
import { CaixaDeEntradaPage } from './pages/produtos/CaixaDeEntradaPage';
import { DetalhesSolicitacaoPage } from './pages/produtos/DetalhesSolicitacaoPage';
import { BasePage } from './pages/produtos/BasePage';
import { SolicitacoesPage } from './pages/produtos/SolicitacoesPage';
import { FornecedoresDashboardPage } from './pages/fornecedores/FornecedoresDashboardPage';
import {
  FornecedoresBasePage,
  FornecedoresCaixaPage,
  FornecedoresInativosPage,
  FornecedoresMinhasPage,
  FornecedoresTodasPage,
  NovaSolicitacaoFornecedorPage,
} from './pages/fornecedores/FornecedoresPages';
import {
  ParametrizacoesAdminPage,
  ParametrizacoesProdutosPage,
} from './pages/parametrizacoes/ParametrizacoesPages';
import { FaqPage, NotificacoesPage, SuportePage } from './pages/ApoioPages';
import { HomePage } from './pages/HomePage';

function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="module-title">{title}</h1>
      <p className="info-banner">Em desenvolvimento — módulo Fiscal (Fase posterior ao protótipo de telas internas).</p>
    </section>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<HomePage />} />

              <Route path="faq" element={<FaqPage />} />
              <Route path="suporte" element={<SuportePage />} />
              <Route path="notificacoes" element={<NotificacoesPage />} />

              <Route path="produtos" element={<ProdutosDashboardPage />} />
              <Route path="produtos/nova-solicitacao" element={<NovaSolicitacaoPage />} />
              <Route path="produtos/dados-do-item" element={<DadosDoItemPage />} />
              <Route path="produtos/caixa-de-entrada" element={<CaixaDeEntradaPage />} />
              <Route path="produtos/solicitacoes" element={<SolicitacoesPage />} />
              <Route path="produtos/solicitacao/:id" element={<DetalhesSolicitacaoPage />} />
              <Route path="produtos/base" element={<BasePage />} />
              <Route path="produtos/todas-solicitacoes" element={<Navigate to="/produtos/solicitacoes" replace />} />
              <Route path="produtos/minhas-solicitacoes" element={<Navigate to="/produtos/solicitacoes" replace />} />
              <Route path="produtos/inativos" element={<Navigate to="/produtos/base" replace />} />

              <Route path="fornecedores" element={<FornecedoresDashboardPage />} />
              <Route path="fornecedores/nova-solicitacao" element={<NovaSolicitacaoFornecedorPage />} />
              <Route path="fornecedores/caixa-de-entrada" element={<FornecedoresCaixaPage />} />
              <Route path="fornecedores/todas-solicitacoes" element={<FornecedoresTodasPage />} />
              <Route path="fornecedores/minhas-solicitacoes" element={<FornecedoresMinhasPage />} />
              <Route path="fornecedores/base" element={<FornecedoresBasePage />} />
              <Route path="fornecedores/inativos" element={<FornecedoresInativosPage />} />

              <Route path="parametrizacoes/produtos" element={<ParametrizacoesProdutosPage />} />
              <Route path="parametrizacoes/administrativo" element={<ParametrizacoesAdminPage />} />

              <Route path="fiscal/centro-custo" element={<Placeholder title="FISCAL — CENTRO DE CUSTO E PAGAMENTO" />} />
              <Route path="fiscal/notas-sem-cadastro" element={<Placeholder title="NOTAS SEM CADASTRO" />} />
              <Route path="fiscal/extemporaneas" element={<Placeholder title="NOTAS EXTEMPORÂNEAS" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
