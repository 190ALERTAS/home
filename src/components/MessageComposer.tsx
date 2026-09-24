import { Fragment, type ReactNode } from 'react';
import { Copy, Share2, Eraser, MessageCircle } from 'lucide-react';
import { canShare, copyText, openWhatsApp, shareText } from '../lib/share';
import { track } from '../lib/analytics';
import { toast } from './toast';
import { confirmDialog } from './dialogs';

/** Renderiza a formatação do WhatsApp (*negrito*, _itálico_) na prévia. */
function renderWhatsApp(text: string): ReactNode[] {
  return text.split('\n').map((line, i, arr) => {
    const parts: ReactNode[] = [];
    const re = /(\*[^*\n]+\*|_[^_\n]+_)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      const token = m[0];
      const inner = token.slice(1, -1);
      parts.push(token.startsWith('*') ? <strong key={k++}>{inner}</strong> : <em key={k++}>{inner}</em>);
      last = m.index + token.length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <Fragment key={i}>
        {parts}
        {i < arr.length - 1 && '\n'}
      </Fragment>
    );
  });
}

export function MessagePreview({ text, time }: { text: string; time?: string }) {
  return (
    <div className="preview-wrap" aria-label="Prévia da mensagem">
      <div className="preview">
        {text.trim() ? renderWhatsApp(text) : <span className="placeholder">A prévia aparece aqui…</span>}
        <span className="meta">{time ?? ''} ✓✓</span>
      </div>
    </div>
  );
}

/**
 * Barra fixa com Copiar / WhatsApp / Compartilhar.
 * `missing` lista campos obrigatórios vazios (pede confirmação antes de enviar).
 */
export function ShareActions({
  text,
  missing,
  onClear,
  onUsed,
  trackId,
}: {
  text: string;
  missing: string[];
  onClear?: () => void;
  /** Chamado quando a mensagem é efetivamente copiada/enviada. */
  onUsed?: () => void;
  trackId: string;
}) {
  const ensure = async (): Promise<boolean> => {
    if (missing.length === 0) return true;
    return confirmDialog({
      title: 'Campos pendentes',
      message: (
        <>
          <p style={{ marginBottom: 10 }}>Os seguintes campos estão vazios:</p>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)' }}>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      ),
      confirmLabel: 'Continuar assim',
      cancelLabel: 'Voltar e preencher',
    });
  };

  const copy = async () => {
    if (!(await ensure())) return;
    const ok = await copyText(text);
    track(`${trackId}_copiar`);
    if (ok) {
      onUsed?.();
      if (navigator.vibrate) navigator.vibrate(18);
      toast({
        title: 'Texto copiado!',
        desc: 'Cole no grupo do WhatsApp.',
        kind: 'success',
        action: { label: 'WhatsApp', onClick: () => openWhatsApp(text) },
      });
    } else {
      toast({ title: 'Não foi possível copiar', desc: 'Selecione o texto da prévia e copie manualmente.', kind: 'error' });
    }
  };

  const whatsapp = async () => {
    if (!(await ensure())) return;
    void copyText(text);
    track(`${trackId}_whatsapp`);
    onUsed?.();
    openWhatsApp(text);
  };

  const share = async () => {
    if (!(await ensure())) return;
    track(`${trackId}_compartilhar`);
    const r = await shareText(text);
    if (r === 'shared') onUsed?.();
    if (r === 'error') toast({ title: 'Não foi possível compartilhar', kind: 'error' });
  };

  return (
    <div className="action-bar">
      {onClear && (
        <button type="button" className="btn icon ghost" onClick={onClear} aria-label="Limpar formulário" title="Limpar">
          <Eraser />
        </button>
      )}
      <button type="button" className="btn primary" onClick={copy}>
        <Copy /> Copiar
      </button>
      <button type="button" className="btn whatsapp" onClick={whatsapp}>
        <MessageCircle /> WhatsApp
      </button>
      {canShare() && (
        <button type="button" className="btn icon" onClick={share} aria-label="Compartilhar" title="Compartilhar">
          <Share2 />
        </button>
      )}
    </div>
  );
}
