import { Component, type ReactNode } from 'react';
import { TriangleAlert, WifiOff } from 'lucide-react';

/** Mensagens dos navegadores (Chrome, Firefox, Safari) e do Vite quando não conseguem baixar a tela. */
const FALHA_DOWNLOAD = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

type Erro = false | 'download' | 'falha';

/**
 * Se a tela falha ao abrir (sem internet ao baixar a tela, versão nova publicada com o app aberto,
 * ou um erro na própria tela), mostra um aviso no lugar dela em vez de deixar o app em branco. O casco
 * (barra, menu) continua.
 * Não recarrega sozinho: o usuário pode estar no meio de um formulário.
 */
export class ErroTela extends Component<{ onTentar: () => void; children: ReactNode }, { erro: Erro }> {
  state: { erro: Erro } = { erro: false };

  static getDerivedStateFromError(e: unknown): { erro: Exclude<Erro, false> } {
    const msg = e instanceof Error ? e.message : '';
    return { erro: FALHA_DOWNLOAD.test(msg) ? 'download' : 'falha' };
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    const download = erro === 'download';
    return (
      <div className="page">
        <div className="card pad empty" style={{ marginTop: 40 }} role="alert">
          {download ? <WifiOff /> : <TriangleAlert />}
          <h1 style={{ fontSize: 22, color: 'var(--text)' }}>
            {download ? 'Não deu para abrir esta tela' : 'Algo deu errado nesta tela'}
          </h1>
          <p>
            {download
              ? 'Verifique a internet e tente de novo.'
              : 'Tente de novo. Se continuar, recarregue o app e avise pela página Sugestões.'}
          </p>
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
