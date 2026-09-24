import { uid } from '../../lib/id';
import { shiftMinutes } from '../../lib/date';
import { ordenar, type Entry, type EscalaDB, type ModeloTurno, type TipoMarcacao, type Turno } from './model';

/** Operações puras sobre a base da escala (fáceis de testar e de desfazer). */

const com = (db: EscalaDB, entries: Entry[]): EscalaDB => ({ ...db, entries: ordenar(entries) });

export function novoTurno(date: string, start: string, end: string, note?: string): Turno {
  return { id: uid(), kind: 'turno', date, start, end, minutes: shiftMinutes(start, end), ...(note ? { note } : {}) };
}

export function adicionarTurno(db: EscalaDB, date: string, start: string, end: string, note?: string): EscalaDB {
  return com(db, [...db.entries, novoTurno(date, start, end, note?.trim() || undefined)]);
}

export function editarTurno(
  db: EscalaDB,
  id: string,
  patch: { date?: string; start?: string; end?: string; note?: string },
): EscalaDB {
  return com(
    db,
    db.entries.map((e) => {
      if (e.id !== id || e.kind !== 'turno') return e;
      const start = patch.start ?? e.start;
      const end = patch.end ?? e.end;
      const mudouHorario = start !== e.start || end !== e.end;
      const note = patch.note !== undefined ? patch.note.trim() || undefined : e.note;
      const next: Turno = {
        ...e,
        date: patch.date ?? e.date,
        start,
        end,
        // Mantém a duração registrada (dados migrados) a menos que o horário mude.
        minutes: mudouHorario ? shiftMinutes(start, end) : e.minutes,
      };
      if (note) next.note = note;
      else delete next.note;
      return next;
    }),
  );
}

export function remover(db: EscalaDB, ids: Iterable<string>): EscalaDB {
  const set = new Set(ids);
  return com(
    db,
    db.entries.filter((e) => !set.has(e.id)),
  );
}

/** Marca férias/afastamento/EDT nas datas (sem repetir). Férias e afastamento substituem-se. */
export function marcar(db: EscalaDB, datas: string[], kind: TipoMarcacao): EscalaDB {
  const alvo = new Set(datas);
  const ausencia = kind === 'ferias' || kind === 'afastamento';
  let entries = db.entries.filter((e) => {
    if (!alvo.has(e.date)) return true;
    if (e.kind === kind) return true;
    // Um dia de ausência não acumula outro tipo de ausência nem EDT.
    if (ausencia && (e.kind === 'ferias' || e.kind === 'afastamento' || e.kind === 'edt')) return false;
    if (kind === 'edt' && (e.kind === 'ferias' || e.kind === 'afastamento')) return false;
    return true;
  });
  const jaTem = new Set(entries.filter((e) => e.kind === kind).map((e) => e.date));
  entries = [...entries, ...datas.filter((d) => !jaTem.has(d)).map((date) => ({ id: uid(), kind, date }) as Entry)];
  return com(db, entries);
}

/** Remove todos os lançamentos (turnos e marcações) das datas. */
export function limparDias(db: EscalaDB, datas: string[]): EscalaDB {
  const alvo = new Set(datas);
  return com(
    db,
    db.entries.filter((e) => !alvo.has(e.date)),
  );
}

/** Lança o mesmo turno em várias datas. `substituir` apaga os turnos já existentes nelas. */
export function aplicarTurno(
  db: EscalaDB,
  datas: string[],
  start: string,
  end: string,
  substituir: boolean,
): EscalaDB {
  const alvo = new Set(datas);
  const base = substituir ? db.entries.filter((e) => !(alvo.has(e.date) && e.kind === 'turno')) : db.entries;
  return com(db, [...base, ...datas.map((d) => novoTurno(d, start, end))]);
}

export function removerMes(db: EscalaDB, mes: string): EscalaDB {
  return com(
    db,
    db.entries.filter((e) => !e.date.startsWith(mes)),
  );
}

export function salvarModelos(db: EscalaDB, modelos: ModeloTurno[]): EscalaDB {
  return { ...db, modelos };
}
