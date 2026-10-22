import { useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { formatMinutes } from '../../../lib/date';
import { GSE_LIMITE } from '../model';
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
  const traco = 8;
  const r = (tamanho - traco) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progresso));
  const x = Math.max(0, Math.min(1, extra));
  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden>
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
        {r.diasConvalescenca > 0 && <span className="badge violet">{r.diasConvalescenca} de convalescença</span>}
        {r.diasEdt > 0 && <span className="badge blue">{r.diasEdt} EDT/RSP</span>}
        {r.extras > 0 && <span className="badge green">Normais {formatMinutes(r.normais)}</span>}
        {r.gse > 0 && (
          <span className={`badge ${r.gseExcedido ? 'red' : 'green'}`} title="Serviço extraordinário: soma à parte da carga do mês">
            GSE {formatMinutes(r.gse)} / {formatMinutes(GSE_LIMITE)}
          </span>
        )}
        {r.sobreaviso > 0 && (
          <span className="badge blue" title="Sobreaviso conta 1/3 das horas na carga do mês">
            Sobreaviso {formatMinutes(r.sobreaviso)} → {formatMinutes(r.sobreavisoComputado)}
          </span>
        )}
        {semMeta && <span className="badge">Mês sem carga horária</span>}
      </div>
      {r.gseExcedido && (
        <div className="callout amber" role="note" style={{ marginTop: 12 }}>
          <TriangleAlert />
          <div>
            Serviço extraordinário acima de {formatMinutes(GSE_LIMITE)} no mês. A NI ADM 033.2 (3.f.1) só admite passar do
            limite em ocorrência já iniciada, situação imprevista ou quando todos da localidade já cumpriram as 40h.
          </div>
        </div>
      )}
      {r.alertaConvalescencaGse && (
        <div className="callout amber" role="note" style={{ marginTop: 12 }}>
          <TriangleAlert />
          <div>
            Convalescença de mais de 1 dia neste mês: pela NI ADM 033.2 (3.e.2.c), não se deve concorrer a escala
            extraordinária no mesmo mês, salvo situação excepcionalíssima justificada.
          </div>
        </div>
      )}
    </div>
  );
}
