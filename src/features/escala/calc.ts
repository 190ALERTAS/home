import { addDays, daysInMonth, hmToMinutes, parseMonthKey, shiftMinutes } from '../../lib/date';
import { GSE_LIMITE, isTurno, servicoDe, type Config, type DiasNoMes, type Entry, type Turno } from './model';

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
  /** Horas que contam na carga ordinária: turnos ordinários + 1/3 do sobreaviso (sem GSE). */
  trabalhado: number;
  normais: number;
  extras: number;
  faltam: number;
  saldo: number;
  /** Todos os turnos do mês, de qualquer tipo de serviço. */
  turnos: number;
  /** trabalhado / meta (pode passar de 1). */
  progresso: number;
  /** Serviço extraordinário (GSE): soma à parte, fora da carga ordinária. */
  gse: number;
  turnosGse: number;
  /** Passou do limite mensal de GSE (40h). */
  gseExcedido: boolean;
  /** Duração cheia dos turnos de sobreaviso e quanto deles conta (1/3). */
  sobreaviso: number;
  sobreavisoComputado: number;
  /** Dias de afastamento por convalescença (já incluídos em diasAfastamento). */
  diasConvalescenca: number;
  /** Mais de 1 dia de convalescença e GSE no mesmo mês (NI ADM 033.2, 3.e.2.c). */
  alertaConvalescencaGse: boolean;
}

/**
 * Minutos que o turno soma na carga ordinária. Sobreaviso conta 1/3 (NI ADM 033.2, 3.d.3);
 * extraordinário (GSE) é contado à parte.
 */
export function minutosComputados(t: Turno): number {
  const s = servicoDe(t);
  if (s === 'gse') return 0;
  if (s === 'sobreaviso') return Math.round(t.minutes / 3);
  return t.minutes;
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
  const convalescenca = new Set<string>();
  let trabalhado = 0;
  let turnos = 0;
  let gse = 0;
  let turnosGse = 0;
  let sobreaviso = 0;
  let sobreavisoComputado = 0;

  for (const e of doMes) {
    if (e.kind === 'turno') {
      const computado = minutosComputados(e);
      trabalhado += computado;
      turnos++;
      const s = servicoDe(e);
      if (s === 'gse') {
        gse += e.minutes;
        turnosGse++;
      } else if (s === 'sobreaviso') {
        sobreaviso += e.minutes;
        sobreavisoComputado += computado;
      }
    } else if (e.kind === 'ferias') ferias.add(e.date);
    else if (e.kind === 'afastamento') {
      afast.add(e.date);
      if (e.motivo === 'convalescenca') convalescenca.add(e.date);
    } else if (e.kind === 'edt') edt.add(e.date);
  }
  const diasConvalescenca = [...convalescenca].filter((d) => !ferias.has(d)).length;

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
    gse,
    turnosGse,
    gseExcedido: gse > GSE_LIMITE,
    sobreaviso,
    sobreavisoComputado,
    diasConvalescenca,
    alertaConvalescencaGse: diasConvalescenca > 1 && turnosGse > 0,
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

/** Dias com turno e indisponibilidade ao mesmo tempo (lançamentos anteriores à versão 5.2). */
export function conflitos(entries: Entry[]): Set<string> {
  const comTurno = new Set<string>();
  const comMarca = new Set<string>();
  for (const e of entries) (e.kind === 'turno' ? comTurno : comMarca).add(e.date);
  return new Set([...comTurno].filter((d) => comMarca.has(d)));
}

export function novoTurnoMinutos(start: string, end: string): number {
  return shiftMinutes(start, end);
}

export function totalTurnos(turnos: Turno[]): number {
  return turnos.reduce((s, t) => s + t.minutes, 0);
}

/**
 * Turno em andamento ou o próximo a começar, a partir de `agora` ("AAAA-MM-DDTHH:MM").
 * Turnos que passam da meia-noite (ou de 24h) terminam no dia seguinte.
 */
export function proximoTurno(entries: Entry[], agora: string): { turno: Turno; emAndamento: boolean } | null {
  let proximo: Turno | null = null;
  for (const e of entries) {
    if (!isTurno(e)) continue;
    const inicio = `${e.date}T${e.start}`;
    const fim = `${hmToMinutes(e.end) <= hmToMinutes(e.start) ? addDays(e.date, 1) : e.date}T${e.end}`;
    if (fim <= agora) continue;
    if (inicio <= agora) return { turno: e, emAndamento: true };
    if (!proximo || inicio < `${proximo.date}T${proximo.start}`) proximo = e;
  }
  return proximo ? { turno: proximo, emAndamento: false } : null;
}
