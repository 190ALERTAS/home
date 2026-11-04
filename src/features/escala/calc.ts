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

/**
 * Minutos do turno que caem em cada dia: até a meia-noite no dia de início e o resto no dia seguinte.
 * Ex.: 12h de 31/10 às 18h até 01/11 às 06h = 6h em 31/10 e 6h em 01/11.
 */
export function minutosPorDia(t: Turno): { date: string; minutes: number }[] {
  const partes: { date: string; minutes: number }[] = [];
  let restante = t.minutes;
  let data = t.date;
  let disponivel = 1440 - hmToMinutes(t.start);
  // Turno normal tem no máximo 24h (2 dias); o laço cobre também duração antiga maior que isso.
  while (restante > 0 && partes.length < 32) {
    const m = Math.min(restante, disponivel);
    partes.push({ date: data, minutes: m });
    restante -= m;
    data = addDays(data, 1);
    disponivel = 1440;
  }
  return partes.length ? partes : [{ date: t.date, minutes: 0 }];
}

/** O turno atravessa a virada do mês (termina em outro mês). */
export function viraMes(t: Turno): boolean {
  return minutosPorDia(t).some((p) => p.date.slice(0, 7) !== t.date.slice(0, 7));
}

/**
 * Minutos do turno mostrados no dia `data` (calendário e folha do dia). Só o turno que vira o mês é
 * dividido por dia; os demais aparecem inteiros no dia em que começam.
 */
export function minutosNoDia(t: Turno, data: string): number {
  if (!viraMes(t)) return t.date === data ? t.minutes : 0;
  return minutosPorDia(t).filter((p) => p.date === data).reduce((s, p) => s + p.minutes, 0);
}

/** Turnos que viram o mês, indexados pelo dia que recebe a continuação (1º dia do mês seguinte). */
export function continuacoesPorDia(entries: Entry[]): Map<string, Turno[]> {
  const map = new Map<string, Turno[]>();
  for (const e of entries) {
    if (!isTurno(e) || !viraMes(e)) continue;
    const dia = minutosPorDia(e).find((p) => p.date.slice(0, 7) !== e.date.slice(0, 7))!.date;
    const list = map.get(dia);
    if (list) list.push(e);
    else map.set(dia, [e]);
  }
  return map;
}

/** Turnos de meses anteriores que continuam dentro de `mes` (aparecem na lista e no PDF do mês). */
export function continuacoesDoMes(entries: Entry[], mes: string): Turno[] {
  return entries.filter((e): e is Turno => isTurno(e) && !e.date.startsWith(mes) && minutosNoMes(e, mes) > 0);
}

/** Minutos do turno que caem dentro do mês `mes` (AAAA-MM). Turno que vira o mês é dividido. */
export function minutosNoMes(t: Turno, mes: string): number {
  return minutosPorDia(t).reduce((s, p) => (p.date.startsWith(mes) ? s + p.minutes : s), 0);
}

/** Como `minutosComputados`, mas só a parte do turno que cai em `mes`. */
export function minutosComputadosNoMes(t: Turno, mes: string): number {
  const m = minutosNoMes(t, mes);
  const s = servicoDe(t);
  if (s === 'gse') return 0;
  if (s === 'sobreaviso') return Math.round(m / 3);
  return m;
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
  // Turno que começa no último dia do mês anterior e termina neste também entra.
  const doMes = entries.filter((e) => e.date.startsWith(mes) || (e.kind === 'turno' && minutosNoMes(e, mes) > 0));

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
      const noMes = minutosNoMes(e, mes);
      if (noMes <= 0) continue;
      const computado = minutosComputadosNoMes(e, mes);
      const comecaNoMes = e.date.startsWith(mes);
      trabalhado += computado;
      if (comecaNoMes) turnos++;
      const s = servicoDe(e);
      if (s === 'gse') {
        gse += noMes;
        if (comecaNoMes) turnosGse++;
      } else if (s === 'sobreaviso') {
        sobreaviso += noMes;
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
