import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MESES, MESES_CURTOS, formatMinutes } from '../../../lib/date';
import { calcularAno } from '../calc';
import { gap } from '../../../components/ui';
import type { EscalaDB } from '../model';

const W = 360;
const H = 210;
const M = { top: 12, right: 6, bottom: 24, left: 34 };

/** Arredonda o topo do eixo para um valor "limpo" (múltiplo de 50h). */
function topoEixo(maxMin: number): number {
  const h = Math.max(50, Math.ceil(maxMin / 60 / 50) * 50);
  return h * 60;
}

/** Coluna com 4px arredondados no topo e base reta. */
function coluna(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function AnoView({ db, ano, onAno, onMes }: { db: EscalaDB; ano: number; onAno: (a: number) => void; onMes: (mes: string) => void }) {
  const r = calcularAno(db.entries, ano, db.config);
  const mesAtual = new Date().getFullYear() === ano ? new Date().getMonth() : -1;
  const [ativo, setAtivo] = useState<number>(mesAtual >= 0 ? mesAtual : r.meses.findIndex((m) => m.trabalhado > 0));

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const topo = topoEixo(Math.max(...r.meses.map((m) => Math.max(m.trabalhado, m.meta))));
  const y = (min: number) => M.top + plotH - (min / topo) * plotH;
  const banda = plotW / 12;
  const barW = Math.min(24, banda * 0.62);
  const ticks = Array.from({ length: Math.floor(topo / 60 / 50) + 1 }, (_, i) => i * 50 * 60);
  const sel = ativo >= 0 ? r.meses[ativo] : null;
  const temDados = r.trabalhado > 0;

  return (
    <div className="stack" style={gap(14)}>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="icon-btn" aria-label="Ano anterior" onClick={() => onAno(ano - 1)}>
          <ChevronLeft />
        </button>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 26, minWidth: 90, textAlign: 'center' }}>{ano}</strong>
        <button type="button" className="icon-btn" aria-label="Próximo ano" onClick={() => onAno(ano + 1)}>
          <ChevronRight />
        </button>
      </div>

      <div className="ano-totais">
        <div className="kpi">
          <span className="v">{formatMinutes(r.trabalhado)}</span>
          <span className="l">Trabalhadas</span>
        </div>
        <div className="kpi">
          <span className={`v ${r.extras > 0 ? 'green' : ''}`}>{formatMinutes(r.extras)}</span>
          <span className="l">Extras no ano</span>
        </div>
        <div className="kpi">
          <span className="v">{r.meses.filter((m) => m.turnos > 0).length}</span>
          <span className="l">Meses lançados</span>
        </div>
      </div>

      <div>
        <div className="row" style={{ fontSize: 12.5, color: 'var(--text-3)', gap: 14, marginBottom: 6 }}>
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)', display: 'inline-block' }} />
            Horas trabalhadas
          </span>
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 14, height: 2, background: 'var(--text-2)', display: 'inline-block' }} />
            Meta do mês
          </span>
        </div>
        <svg className="chart-ano" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Horas trabalhadas por mês em ${ano}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={M.left - 6} y={y(t) + 3.5} fontSize={10} textAnchor="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {t / 60}h
              </text>
            </g>
          ))}
          {r.meses.map((m, i) => {
            const cx = M.left + banda * i + banda / 2;
            const x = cx - barW / 2;
            const topoBarra = y(m.trabalhado);
            const altura = M.top + plotH - topoBarra;
            const marcado = i === ativo;
            return (
              <g key={m.mes}>
                <rect
                  className="bar-hit"
                  x={M.left + banda * i}
                  y={M.top}
                  width={banda}
                  height={plotH + M.bottom}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${MESES[i]}: ${formatMinutes(m.trabalhado)} trabalhadas, meta ${formatMinutes(m.meta)}`}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  onClick={() => setAtivo(i)}
                />
                <path
                  className={`bar-vis${marcado ? ' ativo' : ''}`}
                  d={coluna(x, topoBarra, barW, altura)}
                  fill="var(--primary)"
                  opacity={ativo >= 0 && !marcado ? 0.55 : 1}
                  pointerEvents="none"
                />
                {m.meta > 0 && (
                  <line
                    x1={cx - banda * 0.42}
                    x2={cx + banda * 0.42}
                    y1={y(m.meta)}
                    y2={y(m.meta)}
                    stroke="var(--text-2)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                )}
                <text
                  x={cx}
                  y={H - 7}
                  fontSize={10.5}
                  textAnchor="middle"
                  fontWeight={marcado ? 800 : 600}
                  style={{ fill: marcado ? 'var(--text)' : undefined, textTransform: 'uppercase' }}
                >
                  {MESES_CURTOS[i]}
                </text>
              </g>
            );
          })}
          <line x1={M.left} x2={W - M.right} y1={M.top + plotH} y2={M.top + plotH} stroke="var(--border-strong)" strokeWidth={1} />
        </svg>
        {sel && (
          <div className="chart-tip" aria-live="polite">
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{formatMinutes(sel.trabalhado)}</strong>
            <span className="grow muted">
              {MESES[ativo].charAt(0).toUpperCase() + MESES[ativo].slice(1)} · meta {formatMinutes(sel.meta)}
              {sel.saldo !== 0 && ` · ${sel.saldo > 0 ? 'extras' : 'faltam'} ${formatMinutes(Math.abs(sel.saldo))}`}
            </span>
            <button type="button" className="btn sm" onClick={() => onMes(sel.mes)}>
              Abrir
            </button>
          </div>
        )}
        {!temDados && <p className="subtle" style={{ marginTop: 10, fontSize: 14 }}>Nenhum turno lançado em {ano}.</p>}
      </div>

      <details>
        <summary className="eyebrow" style={{ cursor: 'pointer', padding: '6px 0' }}>
          Ver tabela do ano
        </summary>
        <div className="list" style={{ marginTop: 8 }}>
          {r.meses.map((m, i) => (
            <button key={m.mes} type="button" className="entry" onClick={() => onMes(m.mes)}>
              <span className="info">
                <strong style={{ textTransform: 'capitalize' }}>{MESES[i]}</strong>
                <small>
                  {m.turnos} turno(s) · meta {formatMinutes(m.meta)}
                </small>
              </span>
              <span className="tnum" style={{ color: m.saldo > 0 ? 'var(--green)' : m.saldo < 0 && m.trabalhado > 0 ? 'var(--primary-hi)' : 'var(--text-3)', fontWeight: 600, fontSize: 14 }}>
                {m.trabalhado > 0 ? formatMinutes(m.saldo, { sign: true }) : ''}
              </span>
              <span className="dur">{formatMinutes(m.trabalhado)}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
