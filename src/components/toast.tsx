import { useSyncExternalStore } from 'react';
import { CircleCheck, CircleAlert, Info } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  desc?: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
  leaving?: boolean;
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 220);
}

export function toast(opts: {
  title: string;
  desc?: string;
  kind?: ToastKind;
  action?: { label: string; onClick: () => void };
  duration?: number;
}): number {
  const id = ++seq;
  const item: ToastItem = { id, title: opts.title, desc: opts.desc, kind: opts.kind ?? 'info', action: opts.action };
  items = [...items.slice(-2), item];
  emit();
  const duration = opts.duration ?? (opts.action ? 6000 : 2800);
  setTimeout(() => dismiss(id), duration);
  return id;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={`toast ${t.kind}${t.leaving ? ' leaving' : ''}`}>
            <span className="ico">
              <Icon />
            </span>
            <div className="msg">
              {t.title}
              {t.desc && <small>{t.desc}</small>}
            </div>
            {t.action && (
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
