import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Impede fechar tocando fora (ex.: formulários longos). */
  modalLock?: boolean;
}

let openCount = 0;

/**
 * Folha inferior no celular / janela central no desktop, sobre o <dialog> nativo
 * (acessível: foco preso, Esc fecha, fundo escurecido).
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, wide, modalLock }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Foca o próprio diálogo (e não o primeiro botão) para não exibir um anel de foco solto.
      d.focus({ preventScroll: true });
      openCount++;
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClosed = () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.documentElement.style.overflow = '';
    };
    d.addEventListener('close', onClosed);
    return () => d.removeEventListener('close', onClosed);
  }, []);

  useEffect(
    () => () => {
      // Desmontado aberto: libera a rolagem.
      if (ref.current?.open) {
        openCount = Math.max(0, openCount - 1);
        if (openCount === 0) document.documentElement.style.overflow = '';
      }
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={`sheet${wide ? ' wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (!modalLock && e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="sheet-head">
            <div className="grow">
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
              <X />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
