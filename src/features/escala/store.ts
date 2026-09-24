import { useSyncExternalStore } from 'react';
import { dbVazio, type Entry, type EscalaDB } from './model';
import { mesclar, migrarV1, normalizarV2, paraV1 } from './migrate';

/**
 * Persistência da Escala.
 *
 * - "190a:escala:v2"        → dados atuais (modelo novo)
 * - "registros"             → formato da versão 4; é migrado na primeira abertura e,
 *                             depois disso, mantido como espelho (compatibilidade)
 * - "190a:escala:backup-v1" → cópia intocada dos dados da versão 4, feita antes da migração
 */
export const K_V2 = '190a:escala:v2';
export const K_V1 = 'registros';
export const K_BACKUP_V1 = '190a:escala:backup-v1';
export const K_ESPELHO = '190a:escala:espelho-v1';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type Aviso =
  | { tipo: 'migrado'; turnos: number; marcacoes: number; ignorados: number }
  | { tipo: 'sincronizado'; adicionadas: number }
  | { tipo: 'recuperado' };

function get(kv: KV, k: string): string | null {
  try {
    return kv.getItem(k);
  } catch {
    return null;
  }
}

function set(kv: KV, k: string, v: string): boolean {
  try {
    kv.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

/** Assinatura curta (FNV-1a) para saber se "registros" mudou fora deste app. */
export function assinatura(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}:${s.length}`;
}

function parse(raw: string | null): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function salvar(kv: KV, db: EscalaDB, opts: { espelhar?: boolean } = {}): boolean {
  const ok = set(kv, K_V2, JSON.stringify(db));
  if (ok && opts.espelhar !== false) {
    const v1 = JSON.stringify(paraV1(db.entries));
    if (set(kv, K_V1, v1)) set(kv, K_ESPELHO, assinatura(v1));
  }
  return ok;
}

export function carregar(kv: KV, agora = new Date()): { db: EscalaDB; aviso?: Aviso } {
  const rawV2 = get(kv, K_V2);
  const rawV1 = get(kv, K_V1);

  if (rawV2 != null) {
    const db = normalizarV2(parse(rawV2));
    if (db) {
      // "registros" alterado por fora (ex.: uso temporário da versão antiga): incorpora o que faltar.
      if (rawV1 != null && assinatura(rawV1) !== get(kv, K_ESPELHO)) {
        const { entries } = migrarV1(parse(rawV1));
        const { entries: juntas, adicionadas } = mesclar(db.entries, entries);
        const next = adicionadas > 0 ? { ...db, entries: juntas } : db;
        salvar(kv, next);
        return adicionadas > 0 ? { db: next, aviso: { tipo: 'sincronizado', adicionadas } } : { db: next };
      }
      return { db };
    }
    // Conteúdo ilegível: guarda uma cópia e reconstrói a partir dos dados antigos, se houver.
    set(kv, `${K_V2}:ilegivel:${agora.getTime()}`, rawV2);
  }

  if (rawV1 != null) {
    if (get(kv, K_BACKUP_V1) == null) set(kv, K_BACKUP_V1, rawV1);
    const res = migrarV1(parse(rawV1));
    const db = dbVazio(agora.toISOString());
    db.entries = res.entries;
    db.meta.migracaoV1 = { em: agora.toISOString(), registros: res.total, ignorados: res.ignorados };
    // Não reescreve "registros" na migração: os dados antigos ficam exatamente como estavam.
    salvar(kv, db, { espelhar: false });
    set(kv, K_ESPELHO, assinatura(rawV1));
    const turnos = res.entries.filter((e) => e.kind === 'turno').length;
    return {
      db,
      aviso: rawV2 != null ? { tipo: 'recuperado' } : { tipo: 'migrado', turnos, marcacoes: res.entries.length - turnos, ignorados: res.ignorados },
    };
  }

  return { db: dbVazio(agora.toISOString()) };
}

/* ---------- Store React ---------- */

const memoria = new Map<string, string>();
const kvNavegador: KV = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memoria.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    localStorage.setItem(k, v);
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      memoria.delete(k);
    }
  },
};

let estado: EscalaDB | null = null;
let avisoPendente: Aviso | undefined;
let falhouSalvar = false;
const ouvintes = new Set<() => void>();
const pilhaDesfazer: { entries: Entry[]; rotulo: string }[] = [];
const emitir = () => ouvintes.forEach((l) => l());

export function getEscala(): EscalaDB {
  if (!estado) {
    const r = carregar(kvNavegador);
    estado = r.db;
    avisoPendente = r.aviso;
  }
  return estado;
}

export function consumirAviso(): Aviso | undefined {
  getEscala();
  const a = avisoPendente;
  avisoPendente = undefined;
  return a;
}

/**
 * Aplica uma alteração e salva. Com `rotulo`, a alteração pode ser desfeita.
 * Retorna false se o armazenamento falhou (ex.: memória cheia).
 */
export function atualizar(fn: (db: EscalaDB) => EscalaDB, rotulo?: string): boolean {
  const atual = getEscala();
  const next = fn(atual);
  if (next === atual) return true;
  next.meta = { ...next.meta, atualizadoEm: new Date().toISOString() };
  if (rotulo) {
    pilhaDesfazer.push({ entries: atual.entries, rotulo });
    if (pilhaDesfazer.length > 30) pilhaDesfazer.shift();
  }
  estado = next;
  const ok = salvar(kvNavegador, next);
  falhouSalvar = !ok;
  emitir();
  return ok;
}

export function podeDesfazer(): boolean {
  return pilhaDesfazer.length > 0;
}

export function desfazer(): string | null {
  const item = pilhaDesfazer.pop();
  if (!item) return null;
  const atual = getEscala();
  estado = { ...atual, entries: item.entries, meta: { ...atual.meta, atualizadoEm: new Date().toISOString() } };
  salvar(kvNavegador, estado);
  emitir();
  return item.rotulo;
}

export function ultimoSalvamentoFalhou(): boolean {
  return falhouSalvar;
}

function subscribe(cb: () => void) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

export function useEscala(): EscalaDB {
  return useSyncExternalStore(subscribe, getEscala, getEscala);
}

// Outra aba/janela alterou a escala: acompanha.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== K_V2 || !e.newValue) return;
    const db = normalizarV2(parse(e.newValue));
    if (db) {
      estado = db;
      emitir();
    }
  });
}
