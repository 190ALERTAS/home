import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

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

/* ---------- Bloco expansível (recolhido por padrão) ---------- */

/**
 * Cabeçalho que abre e fecha um conteúdo (botão com `aria-expanded`, seta que gira e resumo do valor
 * escolhido à direita). Recolhido por padrão. Sem `aberto`, cuida do próprio estado; com `aberto` +
 * `onAlternar`, o pai controla. `children` pode ser uma função que recebe `fechar`, que recolhe e
 * devolve o foco ao cabeçalho (o item tocado deixa de existir na tela).
 */
export function Expansivel({
  titulo,
  resumo,
  children,
  aberto,
  inicialmenteAberto = false,
  onAlternar,
  cabecalho,
  className,
}: {
  titulo: ReactNode;
  /** Valor atual mostrado à direita do título, mesmo recolhido. */
  resumo?: ReactNode;
  children: ReactNode | ((api: { fechar: () => void }) => ReactNode);
  aberto?: boolean;
  /** Estado inicial quando o próprio bloco cuida do estado (sem `aberto`). */
  inicialmenteAberto?: boolean;
  onAlternar?: (aberto: boolean) => void;
  /** Envolve o botão num título (h2–h4), para leitores de tela navegarem por ele. */
  cabecalho?: 2 | 3 | 4;
  className?: string;
}) {
  const idTopo = useId();
  const idCorpo = useId();
  const topo = useRef<HTMLButtonElement>(null);
  const [interno, setInterno] = useState(inicialmenteAberto);
  const controlado = aberto !== undefined;
  const open = controlado ? aberto : interno;

  const alternar = (v: boolean) => {
    if (!controlado) setInterno(v);
    onAlternar?.(v);
  };
  const fechar = () => {
    alternar(false);
    topo.current?.focus();
  };

  const botao = (
    <button
      ref={topo}
      id={idTopo}
      type="button"
      className="expansivel-topo"
      aria-expanded={open}
      aria-controls={idCorpo}
      onClick={() => alternar(!open)}
    >
      <span className="expansivel-titulo">{titulo}</span>
      {resumo && <span className="expansivel-resumo">{resumo}</span>}
      <ChevronDown className="expansivel-seta" aria-hidden />
    </button>
  );
  const Cab = cabecalho ? (`h${cabecalho}` as 'h2' | 'h3' | 'h4') : null;

  return (
    <div className={`expansivel${open ? ' aberto' : ''}${className ? ` ${className}` : ''}`}>
      {Cab ? <Cab className="expansivel-cab">{botao}</Cab> : botao}
      <div id={idCorpo} role="region" aria-labelledby={idTopo} className="expansivel-corpo" hidden={!open}>
        {typeof children === 'function' ? children({ fechar }) : children}
      </div>
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
