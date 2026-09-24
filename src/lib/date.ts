/**
 * Utilitários de data/hora sempre no fuso local do aparelho.
 * Datas são strings ISO "AAAA-MM-DD" e horas "HH:MM" (como nos inputs HTML).
 */

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
export const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HM_RE = /^(\d{1,2}):(\d{2})$/;

export function isISODate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function isHM(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = HM_RE.exec(s);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function nowHM(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Converte "AAAA-MM-DD" em Date à meia-noite local (sem o bug de fuso do `new Date(iso)`). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "2026-09-23" → "23/09/2026" */
export function formatDateBR(iso: string): string {
  const m = ISO_RE.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Diferença em dias (b - a). */
export function diffDays(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay();
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthKey(year: number, month1: number): string {
  return `${year}-${pad2(month1)}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export function monthLabel(key: string, opts: { short?: boolean } = {}): string {
  const { year, month } = parseMonthKey(key);
  const nome = opts.short ? MESES_CURTOS[month - 1] : MESES[month - 1];
  return `${nome} ${year}`;
}

export function lastDayOfMonth(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `${key}-${pad2(daysInMonth(year, month))}`;
}

export function hmToMinutes(hm: string): number {
  const m = HM_RE.exec(hm);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Duração de um turno em minutos. Turnos que passam da meia-noite são
 * tratados corretamente (19:00 → 07:00 = 12h). Início igual ao fim = 24h.
 */
export function shiftMinutes(start: string, end: string): number {
  const diff = (hmToMinutes(end) - hmToMinutes(start) + 1440) % 1440;
  return diff === 0 ? 1440 : diff;
}

export function crossesMidnight(start: string, end: string): boolean {
  return hmToMinutes(end) <= hmToMinutes(start);
}

/** 750 → "12h30" ; 720 → "12h" ; 45 → "0h45" */
export function formatMinutes(total: number, opts: { sign?: boolean; pad?: boolean } = {}): string {
  const neg = total < 0;
  const abs = Math.round(Math.abs(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = neg ? '−' : opts.sign ? '+' : '';
  if (m === 0 && !opts.pad) return `${sign}${h}h`;
  return `${sign}${h}h${pad2(m)}`;
}

/** Horas decimais com vírgula: 750 → "12,5" */
export function formatHoursDecimal(total: number, digits = 1): string {
  return (total / 60).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
