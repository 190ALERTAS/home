import { addDays, diffDays, weekdayOf } from '../../lib/date';
import { ordenar, type Entry, type EscalaDB, type Turno } from './model';
import { novoTurno } from './ops';

/** Um dia do ciclo: turno com horário, ou folga (null). */
export type SlotCiclo = { start: string; end: string } | null;

export type Padrao =
  | { tipo: 'ciclo'; dias: SlotCiclo[] }
  | { tipo: 'semana'; diasSemana: number[]; start: string; end: string };

export interface Preset {
  id: string;
  nome: string;
  desc: string;
  padrao: Padrao;
}

export const PRESETS: Preset[] = [
  {
    id: '12x36',
    nome: '12x36',
    desc: '12h de serviço, 36h de folga',
    padrao: { tipo: 'ciclo', dias: [{ start: '07:00', end: '19:00' }, null] },
  },
  {
    id: '12x24-12x48',
    nome: '12x24 · 12x48',
    desc: 'Um dia, uma noite e duas folgas',
    padrao: {
      tipo: 'ciclo',
      dias: [{ start: '07:00', end: '19:00' }, { start: '19:00', end: '07:00' }, null, null],
    },
  },
  {
    id: '24x72',
    nome: '24x72',
    desc: '24h de serviço, 72h de folga',
    padrao: { tipo: 'ciclo', dias: [{ start: '07:00', end: '07:00' }, null, null, null] },
  },
  {
    id: '24x48',
    nome: '24x48',
    desc: '24h de serviço, 48h de folga',
    padrao: { tipo: 'ciclo', dias: [{ start: '07:00', end: '07:00' }, null, null] },
  },
  {
    id: 'semana',
    nome: 'Dias da semana',
    desc: 'Mesmo horário em dias fixos (ex.: seg a sex)',
    padrao: { tipo: 'semana', diasSemana: [1, 2, 3, 4, 5], start: '08:00', end: '14:00' },
  },
];

export interface OpcoesGerador {
  /** Primeiro dia do ciclo (deve ser um dia de serviço no início do ciclo). */
  inicio: string;
  /** Último dia (inclusive). */
  fim: string;
  /** Não lança turnos em dias de férias/afastamento. */
  pularAusencias: boolean;
  /** Apaga turnos já lançados nos dias gerados (senão, mantém e pula esses dias). */
  substituir: boolean;
}

export interface PreviaGerador {
  novos: Turno[];
  removidos: string[];
  pulados: number;
  minutos: number;
}

export function slotDoDia(padrao: Padrao, inicio: string, data: string): SlotCiclo {
  if (padrao.tipo === 'semana') {
    return padrao.diasSemana.includes(weekdayOf(data)) ? { start: padrao.start, end: padrao.end } : null;
  }
  const n = padrao.dias.length;
  if (n === 0) return null;
  const idx = ((diffDays(inicio, data) % n) + n) % n;
  return padrao.dias[idx];
}

export function preverGerador(entries: Entry[], padrao: Padrao, o: OpcoesGerador): PreviaGerador {
  const total = diffDays(o.inicio, o.fim);
  const novos: Turno[] = [];
  const removidos: string[] = [];
  let pulados = 0;
  if (total < 0 || total > 400) return { novos, removidos, pulados, minutos: 0 };

  const porData = new Map<string, Entry[]>();
  for (const e of entries) {
    const l = porData.get(e.date);
    if (l) l.push(e);
    else porData.set(e.date, [e]);
  }

  for (let i = 0; i <= total; i++) {
    const data = addDays(o.inicio, i);
    const slot = slotDoDia(padrao, o.inicio, data);
    if (!slot) continue;
    const doDia = porData.get(data) ?? [];
    if (o.pularAusencias && doDia.some((e) => e.kind === 'ferias' || e.kind === 'afastamento')) {
      pulados++;
      continue;
    }
    const turnos = doDia.filter((e) => e.kind === 'turno');
    if (turnos.length > 0) {
      if (!o.substituir) {
        pulados++;
        continue;
      }
      removidos.push(...turnos.map((t) => t.id));
    }
    novos.push(novoTurno(data, slot.start, slot.end));
  }
  return { novos, removidos, pulados, minutos: novos.reduce((s, t) => s + t.minutes, 0) };
}

export function aplicarGerador(db: EscalaDB, previa: PreviaGerador): EscalaDB {
  const remover = new Set(previa.removidos);
  return { ...db, entries: ordenar([...db.entries.filter((e) => !remover.has(e.id)), ...previa.novos]) };
}
