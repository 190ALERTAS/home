import { useMemo } from 'react';
import { formatMinutes, shiftMinutes } from '../../../lib/date';
import { turnosFrequentes } from '../calc';
import type { Entry, ModeloTurno } from '../model';

export interface OpcaoHorario {
  start: string;
  end: string;
  rotulo: string;
}

/** Atalhos de horário: modelos salvos + horários que o usuário mais usa. */
export function useOpcoesHorario(entries: Entry[], modelos: ModeloTurno[]): OpcaoHorario[] {
  return useMemo(() => {
    const vistos = new Set<string>();
    const out: OpcaoHorario[] = [];
    for (const f of turnosFrequentes(entries, 4)) {
      const k = `${f.start}|${f.end}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const modelo = modelos.find((m) => m.start === f.start && m.end === f.end);
      out.push({ start: f.start, end: f.end, rotulo: modelo ? modelo.nome : `usado ${f.vezes}×` });
    }
    for (const m of modelos) {
      const k = `${m.start}|${m.end}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ start: m.start, end: m.end, rotulo: m.nome });
    }
    return out.slice(0, 6);
  }, [entries, modelos]);
}

export function SlotGrid({
  opcoes,
  onPick,
  selecionado,
}: {
  opcoes: OpcaoHorario[];
  onPick: (o: OpcaoHorario) => void;
  selecionado?: { start: string; end: string } | null;
}) {
  return (
    <div className="slots">
      {opcoes.map((o) => (
        <button
          key={`${o.start}|${o.end}`}
          type="button"
          className="slot"
          aria-pressed={selecionado ? selecionado.start === o.start && selecionado.end === o.end : undefined}
          onClick={() => onPick(o)}
        >
          <b>
            {o.start} – {o.end}
          </b>
          <small>
            {o.rotulo} · {formatMinutes(shiftMinutes(o.start, o.end))}
          </small>
        </button>
      ))}
    </div>
  );
}

/** Dois campos de hora (início/fim) com a duração calculada. */
export function CamposHorario({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (v: { start: string; end: string }) => void;
}) {
  const valido = !!start && !!end;
  const dur = valido ? shiftMinutes(start, end) : 0;
  return (
    <div className="grid-2" style={{ alignItems: 'end' }}>
      <div className="field">
        <label>Início</label>
        <input className="input" type="time" value={start} onChange={(e) => onChange({ start: e.target.value, end })} />
      </div>
      <div className="field">
        <label>
          Fim
          {valido && (
            <span className="badge red" style={{ marginLeft: 'auto' }}>
              {formatMinutes(dur)}
              {dur === 1440 ? ' (24h)' : ''}
            </span>
          )}
        </label>
        <input className="input" type="time" value={end} onChange={(e) => onChange({ start, end: e.target.value })} />
      </div>
    </div>
  );
}
