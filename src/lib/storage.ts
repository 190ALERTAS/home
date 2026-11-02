import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Acesso seguro ao localStorage: nunca lança exceção (modo privado, cota cheia,
 * armazenamento bloqueado). Tudo fica apenas neste aparelho.
 */

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    return writeString(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

interface Envelope<T> {
  v: T;
  t: number;
}

/**
 * O que gravar para `valor`, ou null se não precisa gravar. Sem mudança no conteúdo, a hora antiga
 * fica: abrir a tela não renova o prazo do rascunho (senão uma ocorrência antiga nunca expira).
 */
export function envelopeParaGravar<T>(anterior: unknown, valor: T, agora: number): Envelope<T> | null {
  if (
    anterior &&
    typeof anterior === 'object' &&
    'v' in anterior &&
    JSON.stringify((anterior as Envelope<unknown>).v) === JSON.stringify(valor)
  ) {
    return null;
  }
  return { v: valor, t: agora };
}

/** O valor guardado ainda vale? Precisa ser um envelope e, com `ttlMs`, estar dentro do prazo. */
export function envelopeValido<T = unknown>(env: unknown, agora: number, ttlMs?: number): env is Envelope<T> {
  if (!env || typeof env !== 'object' || !('v' in env)) return false;
  return !ttlMs || agora - ((env as Envelope<T>).t ?? 0) <= ttlMs;
}

/**
 * Estado React persistido no localStorage.
 * Com `ttlMs`, o valor expira (usado para rascunhos de formulários).
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  opts: { ttlMs?: number } = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { ttlMs } = opts;
  const initialRef = useRef(initial);

  const load = (): T => {
    const make = () =>
      typeof initialRef.current === 'function' ? (initialRef.current as () => T)() : initialRef.current;
    const env = readJSON<unknown>(key, null);
    if (!envelopeValido<T>(env, Date.now(), ttlMs)) {
      if (env != null) removeKey(key);
      return make();
    }
    return env.v;
  };

  const [value, setValue] = useState<T>(load);

  useEffect(() => {
    const env = envelopeParaGravar(readJSON<unknown>(key, null), value, Date.now());
    if (env) writeJSON(key, env);
  }, [key, value]);

  const reset = useCallback(() => {
    removeKey(key);
    const init =
      typeof initialRef.current === 'function' ? (initialRef.current as () => T)() : initialRef.current;
    setValue(init);
  }, [key]);

  return [value, setValue, reset];
}

/** Lista de valores recentes (ex.: cidades, unidades) — mais recente primeiro. */
export function pushRecent(key: string, value: string, max = 8): string[] {
  const v = value.trim();
  const list = readJSON<string[]>(key, []);
  if (!v) return list;
  const next = [v, ...list.filter((x) => x.toLocaleUpperCase('pt-BR') !== v.toLocaleUpperCase('pt-BR'))].slice(
    0,
    max,
  );
  writeJSON(key, next);
  return next;
}

export function readRecent(key: string): string[] {
  const list = readJSON<unknown>(key, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}
