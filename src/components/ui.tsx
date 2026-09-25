import { useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type TextareaHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Espaçamento para .stack/.row via variável CSS: style={gap(8)} */
export const gap = (px: number): CSSProperties => ({ '--gap': `${px}px` }) as CSSProperties;

/* ---------- Cabeçalho de página ---------- */

export function PageHead({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <span className="ph-icon" aria-hidden>
        <Icon />
      </span>
      <div className="ph-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </header>
  );
}

/* ---------- Campo com rótulo ---------- */

export function Field({
  label,
  required,
  hint,
  invalid,
  children,
  htmlFor,
  aside,
  className,
  hintId,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  invalid?: boolean;
  children: ReactNode;
  htmlFor?: string;
  aside?: ReactNode;
  className?: string;
  /** Id da dica, para o campo apontar para ela com aria-describedby. */
  hintId?: string;
}) {
  return (
    <div className={`field${invalid ? ' invalid' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="req" aria-label="obrigatório">
            *
          </span>
        )}
        {aside && <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }}>{aside}</span>}
      </label>
      {children}
      {hint && (
        <div className="hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ---------- Área de texto que cresce com o conteúdo ---------- */

export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const { minRows = 4, className, ...rest } = props;
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const min = minRows * lineHeight + 24;
    el.style.height = `${Math.max(min, el.scrollHeight + 2)}px`;
  }, [props.value, minRows]);
  return <textarea ref={ref} className={`textarea${className ? ` ${className}` : ''}`} {...rest} />;
}

/* ---------- Interruptor ---------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <label className="switch" htmlFor={id}>
      <span className="label">
        {label}
        {description && <small>{description}</small>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden />
    </label>
  );
}

/* ---------- Controle segmentado ---------- */

export function Seg<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`seg${className ? ` ${className}` : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Cartão com título ---------- */

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card pad${className ? ` ${className}` : ''}`}>
      {title && (
        <h2 className="card-title">
          <span>{title}</span>
          {actions && <span className="actions">{actions}</span>}
        </h2>
      )}
      {children}
    </section>
  );
}
