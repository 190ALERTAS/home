import { useSyncExternalStore, type ReactNode } from 'react';
import { Sheet } from './Sheet';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Confirmação assíncrona: `if (await confirmDialog({...})) { ... }` */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    pending?.resolve(false);
    pending = { ...opts, resolve };
    emit();
  });
}

function finish(ok: boolean) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(ok);
}

export function DialogHost() {
  const p = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pending,
    () => pending,
  );
  return (
    <Sheet
      open={!!p}
      onClose={() => finish(false)}
      title={p?.title ?? ''}
      footer={
        <>
          <button type="button" className="btn" onClick={() => finish(false)}>
            {p?.cancelLabel ?? 'Cancelar'}
          </button>
          <button type="button" className={`btn ${p?.danger ? 'danger' : 'primary'}`} onClick={() => finish(true)}>
            {p?.confirmLabel ?? 'Confirmar'}
          </button>
        </>
      }
    >
      <div className="muted" style={{ fontSize: 16 }}>
        {p?.message}
      </div>
    </Sheet>
  );
}
