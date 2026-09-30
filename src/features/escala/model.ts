/**
 * Modelo de dados da Escala (versão 2).
 *
 * Tudo fica no localStorage do aparelho. A versão 4 do app guardava os dados na
 * chave "registros" (formato v1); eles são migrados automaticamente — veja migrate.ts.
 */

export type TipoMarcacao = 'ferias' | 'afastamento' | 'edt';

export interface Turno {
  id: string;
  kind: 'turno';
  /** Data de início do turno (AAAA-MM-DD). O turno conta no mês em que começa. */
  date: string;
  start: string; // HH:MM
  end: string; // HH:MM
  /** Duração registrada em minutos. */
  minutes: number;
  note?: string;
}

export interface Marcacao {
  id: string;
  kind: TipoMarcacao;
  date: string;
  note?: string;
}

export type Entry = Turno | Marcacao;

export interface ModeloTurno {
  id: string;
  nome: string;
  start: string;
  end: string;
}

export type DiasNoMes = '28' | '29' | '30' | '31';

export interface Config {
  /** Carga horária mensal (em minutos) conforme a quantidade de dias do mês. */
  metas: Record<DiasNoMes, number>;
  /** Minutos descontados da meta por dia de EDT/RSP. */
  edtMinutos: number;
  perfil: { nome: string; matricula: string; unidade: string };
  /**
   * Revisão da tabela de cargas padrão já aplicada a esta configuração (ver PADRAO_REV).
   * Ausente = configuração anterior à revisão 2, quando o mês de 30 dias valia 170h.
   */
  padraoRev?: number;
}

export interface EscalaDB {
  version: 2;
  entries: Entry[];
  modelos: ModeloTurno[];
  config: Config;
  meta: {
    criadoEm: string;
    atualizadoEm: string;
    migracaoV1?: { em: string; registros: number; ignorados: number };
  };
}

export const HORA = 60;

/**
 * Carga horária padrão: 177h em meses de 31 dias e 171h em meses de 30 dias.
 * Fevereiro (28/29 dias) é configurável; padrão de 160h/165h.
 */
export const METAS_PADRAO: Record<DiasNoMes, number> = {
  '28': 160 * HORA,
  '29': 165 * HORA,
  '30': 171 * HORA,
  '31': 177 * HORA,
};

/**
 * Revisão da tabela de cargas padrão. A 2 trocou o mês de 30 dias de 170h para 171h.
 * Como o valor fica gravado no aparelho (e na nuvem), quem nunca mexeu nele ainda tem 170h:
 * `atualizarPadrao` leva esse valor para o novo padrão uma única vez e carimba a revisão.
 */
export const PADRAO_REV = 2;
const META_30_ANTIGA = 170 * HORA;

/**
 * Migra uma configuração gravada antes da revisão 2: se o mês de 30 dias ainda está no valor
 * antigo (170h), passa para o novo padrão. Qualquer outro valor (personalizado) é mantido.
 * Idempotente e determinística — roda igual em todo aparelho, na leitura local, da nuvem e da base
 * de sincronização, então a migração nunca aparece como "alteração" a ser mesclada.
 */
export function atualizarPadrao(config: Config): Config {
  if ((config.padraoRev ?? 1) >= PADRAO_REV) return config;
  const metas = config.metas['30'] === META_30_ANTIGA ? { ...config.metas, '30': METAS_PADRAO['30'] } : config.metas;
  return { ...config, metas, padraoRev: PADRAO_REV };
}

export const EDT_PADRAO = 6 * HORA;

export const MODELOS_PADRAO: ModeloTurno[] = [
  { id: 'diurno', nome: 'Diurno', start: '07:00', end: '19:00' },
  { id: 'noturno', nome: 'Noturno', start: '19:00', end: '07:00' },
  { id: '24h', nome: '24 horas', start: '07:00', end: '07:00' },
];

export const ROTULO_MARCACAO: Record<TipoMarcacao, { curto: string; longo: string }> = {
  ferias: { curto: 'FÉR', longo: 'Férias' },
  afastamento: { curto: 'AFT', longo: 'Afastamento' },
  edt: { curto: 'EDT', longo: 'EDT/RSP' },
};

export function configPadrao(): Config {
  return {
    metas: { ...METAS_PADRAO },
    edtMinutos: EDT_PADRAO,
    perfil: { nome: '', matricula: '', unidade: '' },
    padraoRev: PADRAO_REV,
  };
}

export function dbVazio(agora = new Date().toISOString()): EscalaDB {
  return {
    version: 2,
    entries: [],
    modelos: MODELOS_PADRAO.map((m) => ({ ...m })),
    config: configPadrao(),
    meta: { criadoEm: agora, atualizadoEm: agora },
  };
}

export function isTurno(e: Entry): e is Turno {
  return e.kind === 'turno';
}

/** Ordena por data, depois turnos por horário de início, marcações antes dos turnos. */
export function ordenar(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind === 'turno' && b.kind === 'turno') return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    if (a.kind === 'turno') return 1;
    if (b.kind === 'turno') return -1;
    return 0;
  });
}
