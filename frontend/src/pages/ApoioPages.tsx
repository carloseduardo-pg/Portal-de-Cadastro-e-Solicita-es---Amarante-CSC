import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../lib/resources';
import type { Notification } from '../lib/types';
import './produtos/produtos.css';

export function NotificacoesPage() {
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    setItems(await notificationsApi.list());
  }

  useEffect(() => { void load(); }, []);

  return (
    <section>
      <h1 className="module-title">NOTIFICAÇÕES</h1>
      <p className="info-banner">Cada notificação leva à solicitação correspondente. Resolvida, sai da lista.</p>
      <button type="button" className="btn btn-outline" onClick={() => void notificationsApi.markAllRead().then(load)}>
        Marcar todas como lidas
      </button>
      <div style={{ marginTop: 16 }}>
        {items.map((n) => (
          <Link
            key={n.id}
            to={n.linkUrl ?? '#'}
            className={`notification-item ${n.readAt ? '' : 'unread'}`}
            onClick={() => void notificationsApi.markRead(n.id)}
          >
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <span className="derived-field">{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FaqPage() {
  return (
    <section className="static-page">
      <h1 className="module-title">FAQ</h1>
      <h2>Como evitar cadastrar item duplicado?</h2>
      <p>Use a busca na Nova Solicitação. O sistema mostra itens parecidos antes de permitir criar um novo.</p>
      <h2>Posso cadastrar vários itens de uma vez?</h2>
      <p>Sim, desde que sejam da mesma família (cadastro em lote).</p>
      <h2>Quem define o NCM?</h2>
      <p>O time Administrativo confirma o NCM sugerido pelo sistema. Nunca é gravado automaticamente.</p>
    </section>
  );
}

export function SuportePage() {
  return (
    <section className="static-page">
      <h1 className="module-title">SUPORTE</h1>
      <p>Entre em contato com o CSC Amarante para dúvidas sobre o portal.</p>
      <p><strong>E-mail:</strong> csc@amarante.com.br (placeholder)</p>
    </section>
  );
}
