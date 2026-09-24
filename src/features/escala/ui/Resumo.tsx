import { useEffect, useRef, useState } from 'react';
import { formatMinutes } from '../../../lib/date';
import type { ResumoMes } from '../calc';

/** Anima números entre valores (efeito de contagem). */
function useContagem(valor: number, duracao = 650): number {
  const [atual, setAtual] = useState(valor);
  const anterior = useRef(valor);
  useEffect(() => {
    const de = anterior.current;
    anterior.current = valor;
    if (de === valor || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setAtual(valor);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / duracao);
      const e = 1 - Math.pow(1 - k, 3);
      setAtual(Math.round(de + (valor - de) * e));
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracao]);
  return atual;
}

function Anel({ progresso, extra }: { progresso: number; extra: number }) {
  const tamanho = 120;
  const traco = 12;
  const r = (tamanho - traco) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progresso));
  const x = Math.max(0, Math.min(1, extra));
  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden>
      <defs>
        <linearGradient id="grad-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--primary-hi)' }} />
          <stop offset="1" style={{ stopColor: 'var(--primary-lo)' }} />
        </linearGradient>
      </defs>
      <circle className="trilho" cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={traco} />
      <circle
        className="progresso"
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={r}
        fill="none"
        strokeWidth={traco}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
      />
      {x > 0 && (
        <circle
          className="extra"
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r - traco - 3}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (r - traco - 3)}
          strokeDashoffset={2 * Math.PI * (r - traco - 3) * (1 - x)}
        />
      )}
    </svg>
  );
}

export function Resumo({ r }: { r: ResumoMes }) {
  const trabalhado = useContagem(r.trabalhado);
  const saldo = useContagem(r.saldo);
  const pct = Math.round(r.progresso * 100);
  const pctAnim = useContagem(pct);
  const semMeta = r.meta === 0;

  return (
    <div>
      <div className="resumo">
        <div className="ring">
          <Anel progresso={r.progresso} extra={r.meta > 0 ? r.extras / r.meta : 0} />
          <div className="centro">
            <span className="pct">
              {pctAnim}
              <small>%</small>
            </span>
            <span className="lbl">da meta</span>
          </div>
        </div>
        <div className="kpis">
          <div className="kpi">
            <span className="v">{formatMinutes(trabalhado)}</span>
            <span className="l">Trabalhadas</span>
          </div>
          <div className="kpi">
            <span className="v">{formatMinutes(r.meta)}</span>
            <span className="l">Meta do mês</span>
          </div>
          <div className="kpi">
            <span className={`v ${saldo > 0 ? 'green' : saldo < 0 ? 'red' : ''}`}>
              {formatMinutes(saldo, { sign: true })}
            </span>
            <span className="l">{r.saldo > 0 ? 'Extras' : r.saldo < 0 ? 'Faltam' : 'Saldo'}</span>
          </div>
          <div className="kpi">
            <span className="v">{r.turnos}</span>
            <span className="l">Turnos</span>
          </div>
        </div>
      </div>
      <div className="resumo-foot">
        <span className="badge" title="Carga horária do mês antes de descontos">
          Base {formatMinutes(r.metaBase)} · {r.dias} dias
        </span>
        {r.diasFerias > 0 && <span className="badge amber">{r.diasFerias} dia(s) de férias</span>}
        {r.diasAfastamento > 0 && <span className="badge violet">{r.diasAfastamento} dia(s) de afastamento</span>}
        {r.diasEdt > 0 && <span className="badge blue">{r.diasEdt} EDT/RSP</span>}
        {r.extras > 0 && <span className="badge green">Normais {formatMinutes(r.normais)}</span>}
        {semMeta && <span className="badge">Mês sem carga horária</span>}
      </div>
    </div>
  );
}
