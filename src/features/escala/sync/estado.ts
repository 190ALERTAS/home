import { useEffect, useState, useSyncExternalStore } from 'react';
import { readJSON, writeJSON, removeKey } from '../../../lib/storage';
import { normalizarV2 } from '../migrate';
import type { Instantaneo } from './merge';

/**
 * Estado da sincronização (fica no aparelho) e regras de tempo.
 * Nada aqui carrega o Firebase: o painel e o indicador funcionam sem tocar na rede.
 */

/**
 * Ritmo da sincronização. Conferir a nuvem é barato (uma consulta que só traz o documento se ele
 * mudou), então dá para conferir sempre que a pessoa volta ao app — o que faz o celular mostrar,
 * ao abrir, o que acabou de ser lançado no computador. Gravar só acontece quando algo mudou aqui.
 */
/** Voltar ao app (ou abrir a tela da escala) confere de novo se a última conferência tem isso ou mais. */
export const INTERVALO_CHECAGEM_MS = 3 * 60_000;
/** Com o app aberto e visível, confere de novo a cada hora. */
export const PERIODICO_MS = 60 * 60_000;
/** Espera depois da última alteração antes de enviar (junta uma rajada de lançamentos numa gravação). */
export const ESPERA_ENVIO_MS = 10_000;
/** Logo depois de uma sincronização, outra (clique repetido, outra aba) não lê a nuvem de novo. */
export const ANTI_RAJADA_MS = 10_000;
/**
 * Depois de falhas seguidas a sincronização automática espera cada vez mais (15 min, 1 h, 4 h, 12 h)
 * — uma falha que se repete não pode virar uma leitura na nuvem a cada poucos minutos.
 */
export function esperaAposFalha(falhas: number): number {
  const degraus = [15 * 60_000, 60 * 60_000, 4 * 60 * 60_000, 12 * 60 * 60_000];
  return degraus[Math.min(Math.max(falhas, 1), degraus.length) - 1];
}

const K_SYNC = '190a:escala:sync';
const K_BASE = '190a:escala:sync-base';

export interface SyncPersistido {
  /** Conta Google conectada. */
  ativo: boolean;
  /** Sincroniza sozinho ao abrir o app, quando a janela de 12 h libera. */
  auto: boolean;
  uid?: string;
  email?: string;
  nome?: string;
  /** Instante (ms) da última sincronização concluída (envio, recebimento ou conferência). */
  ultima?: number;
  /** Instante (ms) da última conferência da nuvem concluída. */
  checado?: number;
  /** A consulta barata foi recusada neste aparelho (índice, regras): sincroniza só pela transação. */
  consultaOff?: true;
  /** Instante (ms) da última tentativa que falhou. */
  tentativa?: number;
  /** Falhas seguidas desde a última sincronização bem-sucedida. */
  falhas?: number;
  /** Erro que não se resolve sozinho (permissão, dados ilegíveis, app antigo): o automático não insiste. */
  permanente?: boolean;
  erro?: string;
  /** A sessão do Google caducou: é preciso entrar de novo. */
  precisaEntrar?: boolean;
  /** Instante (ms) em que a sessão foi dada como perdida — para a nota do painel. */
  precisaEntrarEm?: number;
  /** O que indicou a perda: "sem-sessao" (o navegador não tinha mais o login) ou o código do erro. */
  motivoSessao?: string;
}

/** Zera tudo o que descreve uma sessão perdida (entrou de novo, sincronizou ou desconectou). */
export const SESSAO_OK = { precisaEntrar: undefined, precisaEntrarEm: undefined, motivoSessao: undefined } as const;

export interface SyncEstado extends SyncPersistido {
  ocupado: boolean;
}

function carregar(): SyncEstado {
  const raw = readJSON<Partial<SyncPersistido> | null>(K_SYNC, null);
  const s = raw && typeof raw === 'object' ? raw : {};
  const texto = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const tempo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  return {
    ativo: s.ativo === true,
    auto: s.auto !== false,
    uid: texto(s.uid),
    email: texto(s.email),
    nome: texto(s.nome),
    ultima: tempo(s.ultima),
    checado: tempo(s.checado),
    consultaOff: s.consultaOff === true ? true : undefined,
    tentativa: tempo(s.tentativa),
    falhas: tempo(s.falhas),
    permanente: s.permanente === true ? true : undefined,
    erro: texto(s.erro),
    precisaEntrar: s.precisaEntrar === true ? true : undefined,
    precisaEntrarEm: s.precisaEntrar === true ? tempo(s.precisaEntrarEm) : undefined,
    motivoSessao: s.precisaEntrar === true ? texto(s.motivoSessao) : undefined,
    ocupado: false,
  };
}

let estado: SyncEstado = carregar();
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((l) => l());

export function getSync(): SyncEstado {
  return estado;
}

export function definirSync(patch: Partial<SyncEstado>): void {
  estado = { ...estado, ...patch };
  const { ocupado: _ocupado, ...persistir } = estado;
  writeJSON(K_SYNC, persistir);
  emitir();
}

/** Relê do armazenamento: outra aba pode ter sincronizado enquanto esta esperava. */
export function recarregarSync(): void {
  estado = { ...carregar(), ocupado: estado.ocupado };
  emitir();
}

function subscribe(cb: () => void) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

export function useSync(): SyncEstado {
  return useSyncExternalStore(subscribe, getSync, getSync);
}

// Outra aba mudou o estado (ex.: terminou uma sincronização): acompanha.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== K_SYNC) return;
    estado = { ...carregar(), ocupado: estado.ocupado };
    emitir();
  });
}

/* ---------- Base (a escala como ficou na última sincronização) ---------- */

/**
 * A base é a escala como ficou na última sincronização. O carimbo é o "atualizadoEm" que o documento
 * da nuvem tinha nessa hora: se continua o mesmo, ninguém gravou desde então. Bases gravadas pela
 * versão 5.1 não têm carimbo — a primeira sincronização passa pela transação e o grava.
 */
export interface Base extends Instantaneo {
  carimbo?: string;
}

export function lerBase(uid: string | undefined): Base | null {
  if (!uid) return null;
  const raw = readJSON<Record<string, unknown> | null>(K_BASE, null);
  if (!raw || raw.uid !== uid) return null;
  const db = normalizarV2({ version: 2, entries: raw.entries, modelos: raw.modelos, config: raw.config });
  if (!db) return null;
  const carimbo = typeof raw.carimbo === 'string' && raw.carimbo ? raw.carimbo : undefined;
  return { entries: db.entries, modelos: db.modelos, config: db.config, ...(carimbo ? { carimbo } : {}) };
}

export function salvarBase(uid: string, base: Instantaneo, carimbo?: string): void {
  writeJSON(K_BASE, { uid, entries: base.entries, modelos: base.modelos, config: base.config, ...(carimbo ? { carimbo } : {}) });
}

export function limparBase(): void {
  removeKey(K_BASE);
}

/** "há 35 min", "há 3 h", "há 2 dias". */
export function formatarHa(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

/** "hoje, 14:20" / "ontem, 22:05" / "27/09, 08:10". */
export function formatarQuando(ts: number, agora = Date.now()): string {
  const d = new Date(ts);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((dia(new Date(agora)) - dia(d)) / 86_400_000);
  if (dif === 0) return `hoje, ${hm}`;
  if (dif === 1) return `ontem, ${hm}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hm}`;
}

/* ---------- Situação exibida ao usuário ---------- */

export type Situacao = 'ocupado' | 'sessao' | 'erro' | 'pendente' | 'ok';

export function situacao(s: SyncEstado, pendente: boolean): Situacao {
  if (s.ocupado) return 'ocupado';
  if (s.precisaEntrar) return 'sessao';
  if (s.erro) return 'erro';
  return pendente ? 'pendente' : 'ok';
}

export interface NotaSessao {
  titulo: string;
  texto: string;
  /** Código técnico do motivo (para diagnóstico); ausente em avisos gravados por versões anteriores. */
  codigo?: string;
}

/**
 * Nota do painel quando a sessão do Google foi dada como perdida: o que houve, desde quando e o que
 * fazer. O motivo vem do motor — "sem-sessao" (o navegador não tinha mais o login) ou o código do
 * erro que o Google devolveu.
 */
export function notaSessao(s: SyncEstado, agora: number): NotaSessao {
  const desde = s.precisaEntrarEm != null ? ` · ${formatarQuando(s.precisaEntrarEm, agora)}` : '';
  const porQue =
    s.motivoSessao && s.motivoSessao !== 'sem-sessao'
      ? 'O Google recusou renovar o seu login (senha trocada, acesso revogado ou conta desativada).'
      : 'O navegador não tinha mais o seu login guardado na hora de sincronizar. Isso acontece quando os dados do site são limpos, quando a senha da conta é trocada ou o acesso é revogado, ou quando a rede (proxy/firewall) bloqueia a renovação do login — comum em computadores de trabalho.';
  return {
    titulo: `Sessão do Google encerrada${desde}`,
    texto: `${porQue} A escala deste aparelho está intacta e a cópia na nuvem não foi alterada. Ao entrar de novo, os dois lados são mesclados, sem apagar nada.`,
    codigo: s.motivoSessao,
  };
}

/** Relógio que "bate" enquanto há algo a mostrar (contagem regressiva). */
export function useRelogio(ativo: boolean, passoMs = 30_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return;
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), passoMs);
    return () => clearInterval(t);
  }, [ativo, passoMs]);
  return agora;
}
