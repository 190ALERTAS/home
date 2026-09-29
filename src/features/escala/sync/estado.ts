import { useEffect, useState, useSyncExternalStore } from 'react';
import { readJSON, writeJSON, removeKey } from '../../../lib/storage';
import { normalizarV2 } from '../migrate';
import type { Instantaneo } from './merge';

/**
 * Estado da sincronização (fica no aparelho) e regras de tempo.
 * Nada aqui carrega o Firebase: o painel e o indicador funcionam sem tocar na rede.
 */

/** Uma sincronização por janela de 12 h, manual ou automática: poucas leituras e gravações. */
export const INTERVALO_MS = 12 * 60 * 60 * 1000;
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
  /** Instante (ms) da última sincronização concluída — é o que "gasta" a janela. */
  ultima?: number;
  /** Instante (ms) da última tentativa que falhou. */
  tentativa?: number;
  /** Falhas seguidas desde a última sincronização bem-sucedida. */
  falhas?: number;
  /** Erro que não se resolve sozinho (permissão, dados ilegíveis, app antigo): o automático não insiste. */
  permanente?: boolean;
  erro?: string;
  /** A sessão do Google caducou: é preciso entrar de novo. */
  precisaEntrar?: boolean;
}

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
    tentativa: tempo(s.tentativa),
    falhas: tempo(s.falhas),
    permanente: s.permanente === true ? true : undefined,
    erro: texto(s.erro),
    precisaEntrar: s.precisaEntrar === true ? true : undefined,
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

export function lerBase(uid: string | undefined): Instantaneo | null {
  if (!uid) return null;
  const raw = readJSON<Record<string, unknown> | null>(K_BASE, null);
  if (!raw || raw.uid !== uid) return null;
  const db = normalizarV2({ version: 2, entries: raw.entries, modelos: raw.modelos, config: raw.config });
  return db ? { entries: db.entries, modelos: db.modelos, config: db.config } : null;
}

export function salvarBase(uid: string, base: Instantaneo): void {
  writeJSON(K_BASE, { uid, ...base });
}

export function limparBase(): void {
  removeKey(K_BASE);
}

/* ---------- Janela de 12 h ---------- */

export interface Janela {
  /** Já dá para sincronizar. */
  aberta: boolean;
  restanteMs: number;
  /** 0 logo após sincronizar → 1 quando a janela libera. */
  progresso: number;
}

export function janela(ultima: number | undefined, agora: number, intervalo = INTERVALO_MS): Janela {
  if (ultima == null) return { aberta: true, restanteMs: 0, progresso: 1 };
  // Relógio do aparelho voltou no tempo: no máximo uma janela inteira de espera.
  const restanteMs = Math.min(intervalo, Math.max(0, intervalo - (agora - ultima)));
  return { aberta: restanteMs === 0, restanteMs, progresso: 1 - restanteMs / intervalo };
}

/** "9h 20min", "35 min", "agora". */
export function formatarRestante(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  if (min <= 0) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
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
