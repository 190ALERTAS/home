/**
 * Chave-valor mínimo sobre IndexedDB (para dados grandes, como a imagem do croqui).
 * Falhas (modo privado, navegador antigo) viram no-op silenciosos.
 */

const DB = '190alertas';
const STORE = 'kv';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sem IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, modo);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await tx('readonly', (s) => s.get(key))) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    await tx('readwrite', (s) => s.put(value, key));
    return true;
  } catch {
    return false;
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(key));
  } catch {
    /* ignora */
  }
}
