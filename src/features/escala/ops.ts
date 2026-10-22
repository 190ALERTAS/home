import { uid } from '../../lib/id';
import { shiftMinutes } from '../../lib/date';
import {
  marcacaoDe,
  ordenar,
  type Entry,
  type EscalaDB,
  type Marcacao,
  type ModeloTurno,
  type TipoIndisponibilidade,
  type TipoMarcacao,
  type TipoServico,
  type Turno,
} from './model';

/**
 * Operações puras sobre a base da escala (fáceis de testar e de desfazer).
 *
 * Um dia é escala OU indisponibilidade: lançar um turno tira a indisponibilidade das datas lançadas,
 * e lançar uma indisponibilidade tira os turnos delas. Datas que não são alvo do lançamento nunca são
 * tocadas — dias antigos com os dois juntos ficam como estão até o usuário lançar algo neles.
 */

const com = (db: EscalaDB, entries: Entry[]): EscalaDB => ({ ...db, entries: ordenar(entries) });

export function novoTurno(date: string, start: string, end: string, note?: string, servico?: TipoServico): Turno {
  return {
    id: uid(),
    kind: 'turno',
    date,
    start,
    end,
    minutes: shiftMinutes(start, end),
    ...(servico ? { servico } : {}),
    ...(note ? { note } : {}),
  };
}

/** Tira as indisponibilidades das datas (vão receber turno). */
const semMarcacoes = (entries: Entry[], alvo: Set<string>) => entries.filter((e) => !(alvo.has(e.date) && e.kind !== 'turno'));

export function adicionarTurno(
  db: EscalaDB,
  date: string,
  start: string,
  end: string,
  note?: string,
  servico?: TipoServico,
): EscalaDB {
  return com(db, [...semMarcacoes(db.entries, new Set([date])), novoTurno(date, start, end, note?.trim() || undefined, servico)]);
}

export function editarTurno(
  db: EscalaDB,
  id: string,
  patch: { date?: string; start?: string; end?: string; note?: string; servico?: 'ordinario' | TipoServico },
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
      if (patch.servico === 'ordinario') delete next.servico;
      else if (patch.servico) next.servico = patch.servico;
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

/**
 * Lança a indisponibilidade nas datas: cada uma fica só com ela (sem turnos e sem outra
 * indisponibilidade). A que já é igual (mesmo tipo e motivo) é mantida, com o mesmo id.
 */
export function marcarIndisponibilidade(db: EscalaDB, datas: string[], tipo: TipoIndisponibilidade, note?: string): EscalaDB {
  const alvo = new Set(datas);
  const { kind, motivo } = marcacaoDe(tipo);
  const nota = note?.trim() || undefined;
  const igual = (e: Entry): e is Marcacao => e.kind === kind && e.motivo === motivo;
  const mantidas = new Set<string>();
  const entries = db.entries.flatMap((e): Entry[] => {
    if (!alvo.has(e.date)) return [e];
    if (!igual(e) || mantidas.has(e.date)) return [];
    mantidas.add(e.date);
    if (nota === undefined || e.note === nota) return [e];
    return [{ ...e, note: nota }];
  });
  const novas = [...alvo]
    .filter((d) => !mantidas.has(d))
    .map((date): Marcacao => ({ id: uid(), kind, date, ...(motivo ? { motivo } : {}), ...(nota ? { note: nota } : {}) }));
  return com(db, [...entries, ...novas]);
}

/** Marca férias/afastamento/EDT nas datas (mesma regra de `marcarIndisponibilidade`). */
export function marcar(db: EscalaDB, datas: string[], kind: TipoMarcacao): EscalaDB {
  return marcarIndisponibilidade(db, datas, kind);
}

/**
 * O que um lançamento nas datas vai remover, para pedir confirmação: lançar escala remove as
 * indisponibilidades; lançar indisponibilidade remove os turnos. Trocar uma indisponibilidade por
 * outra não conta (é substituição direta, com "Desfazer").
 */
export function impactoLancamento(
  entries: Entry[],
  datas: string[],
  alvo: 'escala' | 'indisponibilidade',
): { turnos: number; marcacoes: number } {
  const set = new Set(datas);
  let turnos = 0;
  let marcacoes = 0;
  for (const e of entries) {
    if (!set.has(e.date)) continue;
    if (e.kind === 'turno') {
      if (alvo === 'indisponibilidade') turnos++;
    } else if (alvo === 'escala') marcacoes++;
  }
  return { turnos, marcacoes };
}

/** Remove todos os lançamentos (turnos e marcações) das datas. */
export function limparDias(db: EscalaDB, datas: string[]): EscalaDB {
  const alvo = new Set(datas);
  return com(
    db,
    db.entries.filter((e) => !alvo.has(e.date)),
  );
}

/**
 * Lança o mesmo turno em várias datas (tirando as indisponibilidades delas). `substituir` apaga os
 * turnos já existentes nelas.
 */
export function aplicarTurno(
  db: EscalaDB,
  datas: string[],
  start: string,
  end: string,
  substituir: boolean,
  extra: { servico?: TipoServico; note?: string } = {},
): EscalaDB {
  const alvo = new Set(datas);
  const semMarca = semMarcacoes(db.entries, alvo);
  const base = substituir ? semMarca.filter((e) => !(alvo.has(e.date) && e.kind === 'turno')) : semMarca;
  const nota = extra.note?.trim() || undefined;
  return com(db, [...base, ...datas.map((d) => novoTurno(d, start, end, nota, extra.servico))]);
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
