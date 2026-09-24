import { daysInMonth, parseMonthKey, shiftMinutes } from '../../lib/date';
import { isTurno, type Config, type DiasNoMes, type Entry, type Turno } from './model';

export interface ResumoMes {
  mes: string; // AAAA-MM
  dias: number;
  /** Carga horária cheia do mês (antes de descontos). */
  metaBase: number;
  diasFerias: number;
  diasAfastamento: number;
  diasEdt: number;
  /** Desconto proporcional por férias/afastamento. */
  descontoAusencias: number;
  /** Desconto fixo por EDT/RSP. */
  descontoEdt: number;
  /** Carga horária a cumprir (meta ajustada). */
  meta: number;
  trabalhado: number;
  normais: number;
  extras: number;
  faltam: number;
  saldo: number;
  turnos: number;
  /** trabalhado / meta (pode passar de 1). */
  progresso: number;
}

export function metaDoMes(mes: string, config: Config): number {
  const { year, month } = parseMonthKey(mes);
  const dias = String(daysInMonth(year, month)) as DiasNoMes;
  return config.metas[dias] ?? 0;
}

export function entriesDoMes(entries: Entry[], mes: string): Entry[] {
  return entries.filter((e) => e.date.startsWith(mes));
}

export function calcularResumo(entries: Entry[], mes: string, config: Config): ResumoMes {
  const { year, month } = parseMonthKey(mes);
  const dias = daysInMonth(year, month);
  const metaBase = metaDoMes(mes, config);
  const doMes = entriesDoMes(entries, mes);

  const ferias = new Set<string>();
  const afast = new Set<string>();
  const edt = new Set<string>();
  let trabalhado = 0;
  let turnos = 0;

  for (const e of doMes) {
    if (e.kind === 'turno') {
      trabalhado += e.minutes;
      turnos++;
    } else if (e.kind === 'ferias') ferias.add(e.date);
    else if (e.kind === 'afastamento') afast.add(e.date);
    else if (e.kind === 'edt') edt.add(e.date);
  }

  // Um dia ausente (férias ou afastamento) conta uma vez só, e não recebe desconto de EDT.
  const ausentes = new Set([...ferias, ...afast]);
  const edtValidos = [...edt].filter((d) => !ausentes.has(d));

  const descontoAusencias = Math.round((metaBase * ausentes.size) / dias);
  const descontoEdt = edtValidos.length * config.edtMinutos;
  const meta = Math.max(0, metaBase - descontoAusencias - descontoEdt);

  return {
    mes,
    dias,
    metaBase,
    diasFerias: ferias.size,
    diasAfastamento: [...afast].filter((d) => !ferias.has(d)).length,
    diasEdt: edtValidos.length,
    descontoAusencias,
    descontoEdt,
    meta,
    trabalhado,
    normais: Math.min(trabalhado, meta),
    extras: Math.max(0, trabalhado - meta),
    faltam: Math.max(0, meta - trabalhado),
    saldo: trabalhado - meta,
    turnos,
    progresso: meta > 0 ? trabalhado / meta : trabalhado > 0 ? 1 : 0,
  };
}

export interface ResumoAno {
  ano: number;
  meses: ResumoMes[];
  trabalhado: number;
  meta: number;
  extras: number;
}

export function calcularAno(entries: Entry[], ano: number, config: Config): ResumoAno {
  const meses = Array.from({ length: 12 }, (_, i) => calcularResumo(entries, `${ano}-${String(i + 1).padStart(2, '0')}`, config));
  return {
    ano,
    meses,
    trabalhado: meses.reduce((s, m) => s + m.trabalhado, 0),
    meta: meses.reduce((s, m) => s + m.meta, 0),
    extras: meses.reduce((s, m) => s + m.extras, 0),
  };
}

/** Agrupa as entradas por data (para o calendário). */
export function porDia(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

/** Horários mais usados pelo usuário (viram atalhos de um toque). */
export function turnosFrequentes(entries: Entry[], limite = 4): { start: string; end: string; vezes: number }[] {
  const cont = new Map<string, number>();
  const recentes = entries.filter(isTurno).slice(-400);
  for (const t of recentes) {
    const k = `${t.start}|${t.end}`;
    cont.set(k, (cont.get(k) ?? 0) + 1);
  }
  return [...cont.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([k, vezes]) => {
      const [start, end] = k.split('|');
      return { start, end, vezes };
    });
}

/** Turnos idênticos no mesmo dia (possível lançamento em dobro). */
export function duplicados(entries: Entry[]): Set<string> {
  const vistos = new Map<string, string>();
  const dup = new Set<string>();
  for (const e of entries) {
    const k = e.kind === 'turno' ? `${e.date}|${e.start}|${e.end}` : `${e.date}|${e.kind}`;
    if (vistos.has(k)) dup.add(e.id);
    else vistos.set(k, e.id);
  }
  return dup;
}

export function novoTurnoMinutos(start: string, end: string): number {
  return shiftMinutes(start, end);
}

export function totalTurnos(turnos: Turno[]): number {
  return turnos.reduce((s, t) => s + t.minutes, 0);
}
