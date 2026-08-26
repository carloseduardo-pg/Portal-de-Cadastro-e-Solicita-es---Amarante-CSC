import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import './LoginPage.css';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/home" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-visual-overlay">
          <p className="login-visual-tag">Amarante CSC</p>
          <h2>Portal de Cadastro & Solicitação</h2>
          <p>Centralize cadastros de itens e solicitações da rede hoteleira.</p>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={onSubmit}>
          <BrandLogo className="login-logo" />
          <h1 className="login-title">ACESSO INTERNO</h1>
          <p className="login-subtitle">Entre com seu e-mail corporativo</p>

          <label className="field-label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label className="field-label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />

          <button type="button" className="login-forgot">
            Esqueci minha senha
          </button>

          {error ? <p className="login-error">{error}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <footer className="login-footer">
          <span>Desenvolvido por</span>
          <img src="/marca/logo_prottus.png" alt="Prottus" />
        </footer>
      </div>
    </div>
  );
}
