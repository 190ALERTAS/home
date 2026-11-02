import { Component, type ReactNode } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Se a tela falha ao abrir (sem internet ao baixar a tela, versão nova publicada com o app aberto),
 * mostra um aviso no lugar dela em vez de deixar o app em branco. O casco (barra, menu) continua.
 * Não recarrega sozinho: o usuário pode estar no meio de um formulário.
 */
export class ErroTela extends Component<{ onTentar: () => void; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError(): { erro: true } {
    return { erro: true };
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="page">
        <div className="card pad empty" style={{ marginTop: 40 }} role="alert">
          <WifiOff />
          <h1 style={{ fontSize: 22, color: 'var(--text)' }}>Não deu para abrir esta tela</h1>
          <p>Verifique a internet e tente de novo.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn primary" onClick={this.props.onTentar}>
              Tentar de novo
            </button>
            <button type="button" className="btn" onClick={() => location.reload()}>
              Recarregar o app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
