import { afterEach, describe, expect, it, vi } from 'vitest';
import { idbSet } from './idb';

/** IndexedDB mínimo: o request da gravação dá certo e depois a transação termina como pedido. */
function stubIndexedDB(fim: 'completa' | 'aborta' | 'lanca') {
  const close = vi.fn();
  const db = {
    objectStoreNames: { contains: () => true },
    close,
    transaction: () => {
      if (fim === 'lanca') throw new DOMException('mudança de versão', 'InvalidStateError');
      const t: Record<string, unknown> = { error: new DOMException('cota', 'QuotaExceededError') };
      t.objectStore = () => ({
        put: () => {
          const req: Record<string, unknown> = { result: 'k' };
          queueMicrotask(() => {
            (req.onsuccess as (() => void) | undefined)?.();
            queueMicrotask(() => {
              const h = fim === 'completa' ? t.oncomplete : t.onabort;
              (h as (() => void) | undefined)?.();
            });
          });
          return req;
        },
      });
      return t;
    },
  };
  vi.stubGlobal('indexedDB', {
    open: () => {
      const req: Record<string, unknown> = {};
      queueMicrotask(() => {
        req.result = db;
        (req.onsuccess as (() => void) | undefined)?.();
      });
      return req;
    },
  });
  return { close };
}

describe('gravação no IndexedDB', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gravação abortada depois do request devolve false', async () => {
    stubIndexedDB('aborta');
    expect(await idbSet('k', 1)).toBe(false);
  });

  it('gravação confirmada devolve true', async () => {
    stubIndexedDB('completa');
    expect(await idbSet('k', 1)).toBe(true);
  });

  it('db é fechado nos dois casos', async () => {
    const a = stubIndexedDB('aborta');
    await idbSet('k', 1);
    expect(a.close).toHaveBeenCalledTimes(1);
    const b = stubIndexedDB('completa');
    await idbSet('k', 1);
    expect(b.close).toHaveBeenCalledTimes(1);
  });

  it('erro ao abrir a transação devolve false e fecha o db', async () => {
    const { close } = stubIndexedDB('lanca');
    expect(await idbSet('k', 1)).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
