import { isHM, isISODate, pad2 } from '../../lib/date';
import { uid } from '../../lib/id';
import { configPadrao, dbVazio, MODELOS_PADRAO, ordenar, type Entry, type EscalaDB, type ModeloTurno } from './model';

/**
 * Formato v1 (versão 4 do app, chave "registros" no localStorage):
 *
 * {
 *   "2025-03": [
 *     { "data": "2025-03-01", "inicio": "07:00", "fim": "19:00", "horasTrabalhadas": "12h0m" },
 *     { "data": "2025-03-10", "inicio": "-", "fim": "-", "horasTrabalhadas": "FER", "tipo": "FER" },
 *     { "data": "2025-03-12", "inicio": "-", "fim": "-", "horasTrabalhadas": "EDT/RSP", "tipo": "EDT/RSP" }
 *   ]
 * }
 */
export interface RegistroV1 {
  data: string;
  inicio: string;
  fim: string;
  horasTrabalhadas: string;
  tipo?: 'FER' | 'EDT/RSP';
}
export type DadosV1 = Record<string, RegistroV1[]>;

const MES_RE = /^\d{4}-\d{2}$/;

/** Parece dados da versão 4? (objeto com chaves AAAA-MM contendo listas) */
export function pareceV1(raw: unknown): raw is Record<string, unknown[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const keys = Object.keys(raw);
  if (keys.length === 0) return true;
  return keys.every((k) => MES_RE.test(k) && Array.isArray((raw as Record<string, unknown>)[k]));
}

/** "12h30m" → 750. Retorna null se não reconhecer. */
export function parseHorasV1(valor: unknown): number | null {
  if (typeof valor !== 'string') return null;
  const m = /^\s*(\d+)\s*h\s*(\d+)\s*m?\s*$/i.exec(valor);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Cálculo de duração exatamente como a versão 4 fazia (início = fim resultava em 0h). */
export function duracaoV1(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  let horas = hf - hi;
  let minutos = mf - mi;
  if (minutos < 0) {
    minutos += 60;
    horas -= 1;
  }
  if (horas < 0) horas += 24;
  return horas * 60 + minutos;
}

export interface ResultadoMigracao {
  entries: Entry[];
  /** Registros lidos no arquivo/armazenamento antigo. */
  total: number;
  /** Registros sem data válida (não aproveitáveis). */
  ignorados: number;
}

/** Converte os dados da versão 4 para o modelo novo, preservando as horas registradas. */
export function migrarV1(raw: unknown): ResultadoMigracao {
  const entries: Entry[] = [];
  let total = 0;
  let ignorados = 0;
  if (!pareceV1(raw)) return { entries, total, ignorados };

  for (const lista of Object.values(raw)) {
    for (const r of lista) {
      total++;
      if (!r || typeof r !== 'object') {
        ignorados++;
        continue;
      }
      const reg = r as Partial<RegistroV1>;
      if (!isISODate(reg.data)) {
        ignorados++;
        continue;
      }
      const tipo = reg.tipo ?? reg.horasTrabalhadas;
      if (tipo === 'FER') {
        entries.push({ id: uid(), kind: 'ferias', date: reg.data });
        continue;
      }
      if (tipo === 'EDT/RSP') {
        entries.push({ id: uid(), kind: 'edt', date: reg.data });
        continue;
      }
      const inicioOk = isHM(reg.inicio);
      const fimOk = isHM(reg.fim);
      let minutos = parseHorasV1(reg.horasTrabalhadas);
      if (minutos == null) {
        if (!inicioOk || !fimOk) {
          ignorados++;
          continue;
        }
        minutos = duracaoV1(reg.inicio!, reg.fim!);
      }
      const start = inicioOk ? normalizarHM(reg.inicio!) : '00:00';
      const end = fimOk ? normalizarHM(reg.fim!) : somarMinutos(start, minutos);
      entries.push({ id: uid(), kind: 'turno', date: reg.data, start, end, minutes: minutos });
    }
  }
  return { entries: ordenar(entries), total, ignorados };
}

function normalizarHM(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  return `${pad2(h)}:${pad2(m)}`;
}

function somarMinutos(hm: string, minutos: number): string {
  const [h, m] = hm.split(':').map(Number);
  const total = (h * 60 + m + minutos) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function formatHorasV1(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${minutos % 60}m`;
}

/**
 * Gera o formato v1 a partir do modelo novo. Mantido em "registros" para que,
 * se um dia for preciso voltar à versão 4, os lançamentos recentes não se percam.
 */
export function paraV1(entries: Entry[]): DadosV1 {
  const out: DadosV1 = {};
  for (const e of ordenar(entries)) {
    const mes = e.date.slice(0, 7);
    const lista = (out[mes] ??= []);
    if (e.kind === 'turno') {
      lista.push({ data: e.date, inicio: e.start, fim: e.end, horasTrabalhadas: formatHorasV1(e.minutes) });
    } else if (e.kind === 'edt') {
      lista.push({ data: e.date, inicio: '-', fim: '-', horasTrabalhadas: 'EDT/RSP', tipo: 'EDT/RSP' });
    } else {
      // férias e afastamentos (este não existia na v4) descontam a meta do mesmo jeito
      lista.push({ data: e.date, inicio: '-', fim: '-', horasTrabalhadas: 'FER', tipo: 'FER' });
    }
  }
  return out;
}

/* ---------- Importação de backup (arquivo .json) ---------- */

export type Importado =
  | { formato: 'v2'; db: EscalaDB }
  | { formato: 'v1'; resultado: ResultadoMigracao }
  | { formato: 'invalido' };

function entradaValida(e: unknown): e is Entry {
  if (!e || typeof e !== 'object') return false;
  const x = e as Record<string, unknown>;
  if (typeof x.id !== 'string' || !isISODate(x.date)) return false;
  if (x.kind === 'turno') return isHM(x.start) && isHM(x.end) && typeof x.minutes === 'number' && x.minutes >= 0;
  return x.kind === 'ferias' || x.kind === 'afastamento' || x.kind === 'edt';
}

/** Valida e completa um objeto v2 (do armazenamento ou de um backup). */
export function normalizarV2(raw: unknown): EscalaDB | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as Partial<EscalaDB>;
  if (x.version !== 2 || !Array.isArray(x.entries)) return null;
  const base = dbVazio();
  const config = { ...configPadrao(), ...(x.config ?? {}) };
  config.metas = { ...configPadrao().metas, ...(x.config?.metas ?? {}) };
  config.perfil = { ...configPadrao().perfil, ...(x.config?.perfil ?? {}) };
  const modelos = Array.isArray(x.modelos)
    ? x.modelos.filter(
        (m): m is ModeloTurno => !!m && typeof m.nome === 'string' && isHM(m.start) && isHM(m.end) && typeof m.id === 'string',
      )
    : MODELOS_PADRAO.map((m) => ({ ...m }));
  return {
    version: 2,
    entries: ordenar(x.entries.filter(entradaValida)),
    modelos,
    config,
    meta: { ...base.meta, ...(x.meta ?? {}) },
  };
}

export function interpretarBackup(texto: string): Importado {
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch {
    return { formato: 'invalido' };
  }
  const v2 = normalizarV2(raw);
  if (v2) return { formato: 'v2', db: v2 };
  if (pareceV1(raw) && Object.keys(raw as object).length > 0) {
    return { formato: 'v1', resultado: migrarV1(raw) };
  }
  return { formato: 'invalido' };
}

/** Chave de igualdade para evitar duplicar lançamentos ao mesclar. */
export function chaveEntrada(e: Entry): string {
  return e.kind === 'turno' ? `t|${e.date}|${e.start}|${e.end}|${e.minutes}` : `${e.kind}|${e.date}`;
}

/** Junta entradas novas às existentes, sem repetir as que já existem. */
export function mesclar(existentes: Entry[], novas: Entry[]): { entries: Entry[]; adicionadas: number } {
  const chaves = new Set(existentes.map(chaveEntrada));
  const add: Entry[] = [];
  for (const e of novas) {
    const k = chaveEntrada(e);
    if (chaves.has(k)) continue;
    chaves.add(k);
    add.push({ ...e, id: uid() });
  }
  return { entries: ordenar([...existentes, ...add]), adicionadas: add.length };
}
