import { useState } from 'react';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import { PageHead } from '../../components/ui';
import { useOnline } from '../../lib/pwa';

const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfdlIIcfScBCkobJGqkdPvSsg6_gyetDMhVd4zHxZQJQGSgVg/viewform';

export default function SugestoesPage() {
  const online = useOnline();
  const [carregado, setCarregado] = useState(false);
  return (
    <div className="page">
      <PageHead
        icon={MessageSquareText}
        title="Sugestões"
        subtitle="Ideias, correções e novos modelos de mensagem são bem-vindos."
        actions={
          <a className="icon-btn" href={FORM} target="_blank" rel="noopener noreferrer" aria-label="Abrir formulário em nova aba" title="Abrir em nova aba">
            <ExternalLink />
          </a>
        }
      />
      {online ? (
        <div className="card" style={{ overflow: 'hidden', position: 'relative', minHeight: 420 }}>
          {!carregado && (
            <div className="empty" style={{ position: 'absolute', inset: 0 }}>
              <span className="spinner" /> Carregando formulário…
            </div>
          )}
          <iframe
            src={`${FORM}?embedded=true`}
            title="Formulário de sugestões"
            style={{ width: '100%', height: 900, border: 0, display: 'block', background: '#fff' }}
            onLoad={() => setCarregado(true)}
          />
        </div>
      ) : (
        <div className="card pad empty">
          <MessageSquareText />
          <p>Sem conexão no momento. O formulário de sugestões precisa de internet.</p>
        </div>
      )}
      <p className="subtle" style={{ marginTop: 12, fontSize: 13.5 }}>
        Se o formulário não abrir,{' '}
        <a href={FORM} target="_blank" rel="noopener noreferrer">
          acesse por aqui
        </a>
        .
      </p>
    </div>
  );
}
