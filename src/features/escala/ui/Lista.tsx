import { CalendarX, Moon, Sun, TriangleAlert } from 'lucide-react';
import { DIAS_SEMANA_CURTOS, crossesMidnight, formatMinutes, weekdayOf } from '../../../lib/date';
import { ROTULO_INDISP, ROTULO_SERVICO, indisponibilidadeDe, servicoDe, type Entry } from '../model';
import { ICONE_INDISP } from './Indisponibilidade';
import { rotuloServico } from './DiaSheet';

const COR_INDISP = { ferias: 'amber', afastamento: 'violet', convalescenca: 'violet', edt: 'blue' } as const;

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
          const servico = servicoDe(e);
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
                <small>{[rotuloServico(e), e.note || (noite ? 'Termina no dia seguinte' : 'Turno')].filter(Boolean).join(' · ')}</small>
              </span>
              {servico !== 'ordinario' && (
                <span className={`badge ${servico === 'gse' ? 'green' : 'blue'}`}>{ROTULO_SERVICO[servico].curto}</span>
              )}
              {duplicados.has(e.id) && (
                <span className="badge amber" title="Turno repetido no mesmo dia">
                  <TriangleAlert />
                </span>
              )}
              <span className="dur">{formatMinutes(e.minutes)}</span>
            </button>
          );
        }
        const tipo = indisponibilidadeDe(e);
        const Icon = ICONE_INDISP[tipo];
        return (
          <button key={e.id} type="button" className="entry" onClick={() => onDia(e.date)}>
            <span className="d">
              <b>{dia}</b>
              <small>{sem}</small>
            </span>
            <span className="info">
              <strong>
                <Icon size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {ROTULO_INDISP[tipo].longo}
              </strong>
              <small>{e.note || 'Desconta da carga horária'}</small>
            </span>
            <span className={`badge ${COR_INDISP[tipo]}`}>{ROTULO_INDISP[tipo].curto}</span>
          </button>
        );
      })}
    </div>
  );
}
