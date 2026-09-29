import { CalendarX, Moon, Palmtree, Stethoscope, Sun, TriangleAlert } from 'lucide-react';
import { DIAS_SEMANA_CURTOS, crossesMidnight, formatMinutes, weekdayOf } from '../../../lib/date';
import { ROTULO_MARCACAO, type Entry } from '../model';

const ICONES = { ferias: Palmtree, afastamento: Stethoscope, edt: CalendarX };

/** Lista cronológica dos lançamentos do mês. */
export function ListaMes({ entries, duplicados, onDia }: { entries: Entry[]; duplicados: Set<string>; onDia: (d: string) => void }) {
  if (entries.length === 0) {
    return (
      <div className="empty">
        <CalendarX />
        <p>Nenhum lançamento neste mês.</p>
      </div>
    );
  }
  return (
    <div className="list">
      {entries.map((e) => {
        const dia = Number(e.date.slice(8));
        const sem = DIAS_SEMANA_CURTOS[weekdayOf(e.date)];
        if (e.kind === 'turno') {
          const noite = crossesMidnight(e.start, e.end);
          return (
            <button key={e.id} type="button" className="entry" onClick={() => onDia(e.date)}>
              <span className="d">
                <b>{dia}</b>
                <small>{sem}</small>
              </span>
              <span className="info">
                <strong>
                  {noite ? <Moon size={14} style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--blue)' }} /> : <Sun size={14} style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--primary-hi)' }} />}{' '}
                  {e.start} – {e.end}
                </strong>
                <small>{e.note || (noite ? 'Termina no dia seguinte' : 'Turno')}</small>
              </span>
              {duplicados.has(e.id) && (
                <span className="badge amber" title="Turno repetido no mesmo dia">
                  <TriangleAlert />
                </span>
              )}
              <span className="dur">{formatMinutes(e.minutes)}</span>
            </button>
          );
        }
        const Icon = ICONES[e.kind];
        return (
          <button key={e.id} type="button" className="entry" onClick={() => onDia(e.date)}>
            <span className="d">
              <b>{dia}</b>
              <small>{sem}</small>
            </span>
            <span className="info">
              <strong>
                <Icon size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {ROTULO_MARCACAO[e.kind].longo}
              </strong>
              <small>Desconta da carga horária</small>
            </span>
            <span className={`badge ${e.kind === 'ferias' ? 'amber' : e.kind === 'edt' ? 'blue' : 'violet'}`}>
              {ROTULO_MARCACAO[e.kind].curto}
            </span>
          </button>
        );
      })}
    </div>
  );
}
