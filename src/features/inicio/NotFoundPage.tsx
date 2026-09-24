import { MapPinOff } from 'lucide-react';
import { linkProps } from '../../lib/router';

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="card pad empty" style={{ marginTop: 40 }}>
        <MapPinOff />
        <h1 style={{ fontSize: 26, color: 'var(--text)' }}>Página não encontrada</h1>
        <p>O endereço acessado não existe nesta versão do 190 ALERTAS.</p>
        <a className="btn primary" {...linkProps('inicio')}>
          Ir para o início
        </a>
      </div>
    </div>
  );
}
