import './produtos/produtos.css';

/** FAQ e suporte — páginas estáticas de apoio. */
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
    </section>
  );
}
