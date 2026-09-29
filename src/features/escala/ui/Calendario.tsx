import { useRef } from 'react';
import { Moon } from 'lucide-react';
import { DIAS_SEMANA_CURTOS, crossesMidnight, daysInMonth, formatMinutes, pad2, parseMonthKey } from '../../../lib/date';
import type { Entry, Turno } from '../model';

interface Props {
  mes: string;
  porData: Map<string, Entry[]>;
  hoje: string;
  duplicados: Set<string>;
  selecao: Set<string> | null;
  onDia: (data: string) => void;
  onSwipe: (delta: 1 | -1) => void;
}

function horasCurtas(min: number): string {
  return formatMinutes(min);
}

export function Calendario({ mes, porData, hoje, duplicados, selecao, onDia, onSwipe }: Props) {
  const { year, month } = parseMonthKey(mes);
  const total = daysInMonth(year, month);
  const offset = new Date(year, month - 1, 1).getDay();
  const toque = useRef<{ x: number; y: number; t: number } | null>(null);

  const celulas: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => `${mes}-${pad2(i + 1)}`),
  ];

  return (
    <div
      className="cal"
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        toque.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      }}
      onPointerUp={(e) => {
        const t = toque.current;
        toque.current = null;
        if (!t) return;
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && Date.now() - t.t < 600) onSwipe(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => (toque.current = null)}
    >
      <div className="cal-head" aria-hidden>
        {DIAS_SEMANA_CURTOS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid" role="group" aria-label="Dias do mês">
        {celulas.map((data, i) => {
          if (!data) return <span key={`v${i}`} className="day vazio" aria-hidden />;
          const itens = porData.get(data) ?? [];
          const turnos = itens.filter((e): e is Turno => e.kind === 'turno');
          const minutos = turnos.reduce((s, t) => s + t.minutes, 0);
          const noturnos = turnos.filter((t) => crossesMidnight(t.start, t.end)).length;
          const ferias = itens.some((e) => e.kind === 'ferias');
          const afast = itens.some((e) => e.kind === 'afastamento');
          const edt = itens.some((e) => e.kind === 'edt');
          const dup = itens.some((e) => duplicados.has(e.id));
          const dia = Number(data.slice(8));
          const dom = (offset + dia - 1) % 7 === 0;
          const cls = [
            'day',
            turnos.length ? 'trabalho' : '',
            ferias ? 'ferias' : afast ? 'afastamento' : '',
            edt ? 'edt' : '',
            data === hoje ? 'hoje' : '',
            dom ? 'dom' : '',
            selecao?.has(data) ? 'sel' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const descricao = [
            turnos.length ? `${turnos.length} turno(s), ${formatMinutes(minutos)}` : '',
            ferias ? 'férias' : '',
            afast ? 'afastamento' : '',
            edt ? 'EDT/RSP' : '',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              key={data}
              type="button"
              className={cls}
              onClick={() => onDia(data)}
              aria-label={`Dia ${dia}${descricao ? `: ${descricao}` : ''}`}
              aria-pressed={selecao ? selecao.has(data) : undefined}
            >
              <span className="n">{dia}</span>
              {dup && <span className="dup" title="Possível lançamento em dobro" />}
              {turnos.length > 0 ? (
                <span>
                  <span className="h">
                    {horasCurtas(minutos)}
                    {noturnos > 0 && <Moon className="lua" />}
                  </span>
                  <span
                    className={`bar${noturnos === turnos.length ? ' noite' : noturnos > 0 ? ' misto' : ''}`}
                    style={{ width: `${Math.min(100, (minutos / 720) * 100)}%` }}
                  />
                </span>
              ) : ferias ? (
                <span className="tag">FÉR</span>
              ) : afast ? (
                <span className="tag">AFT</span>
              ) : edt ? (
                <span className="tag edt">EDT</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="cal-legend" aria-hidden>
        <span>
          <i style={{ background: 'var(--primary)' }} />
          Diurno
        </span>
        <span>
          <i style={{ background: 'var(--blue)' }} />
          Noturno
        </span>
        <span>
          <i style={{ background: 'var(--amber)' }} />
          Férias
        </span>
        <span>
          <i style={{ background: 'var(--violet)' }} />
          Afastamento
        </span>
        <span>
          <i style={{ background: 'var(--blue-soft)', boxShadow: 'inset 0 0 0 1px var(--blue)' }} />
          EDT/RSP
        </span>
      </div>
    </div>
  );
}
