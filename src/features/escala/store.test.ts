import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../components/toast', () => ({ toast: vi.fn() }));

describe('outra aba alterou a escala', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('troca o estado e esvazia o desfazer', async () => {
    const s = await import('./store');
    const { dbVazio } = await import('./model');
    s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar');
    expect(s.podeDesfazer()).toBe(true);
    const outra = dbVazio(new Date().toISOString());
    expect(s.aplicarDeOutraAba(JSON.stringify(outra))).toBe(true);
    expect(s.podeDesfazer()).toBe(false);
  });

  it('valor ilegível não mexe no estado nem no desfazer', async () => {
    const s = await import('./store');
    s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar');
    const antes = s.getEscala();
    expect(s.aplicarDeOutraAba('{lixo')).toBe(false);
    expect(s.getEscala()).toBe(antes);
    expect(s.podeDesfazer()).toBe(true);
  });
});

describe('sem armazenamento no aparelho', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('sem localStorage, a alteração vale na sessão e o aviso aparece uma vez', async () => {
    const { toast } = await import('../../components/toast');
    vi.mocked(toast).mockClear();
    const s = await import('./store');
    expect(s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar')).toBe(true);
    expect(s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar de novo')).toBe(true);
    expect(s.emModoTemporario()).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    const aviso = vi.mocked(toast).mock.calls[0][0];
    expect(aviso.kind).toBe('error');
    expect(aviso.title).toContain('até fechar o app');
  });

  it('cota cheia só para "registros": turno apagado não volta ao reabrir o app', async () => {
    const dados = new Map<string, string>();
    let cheioV1 = false;
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (cheioV1 && k === 'registros') throw new DOMException('quota', 'QuotaExceededError');
        dados.set(k, v);
      },
      removeItem: (k: string) => void dados.delete(k),
    });
    // 1ª sessão: lança um turno com o armazenamento funcionando.
    let s = await import('./store');
    const turno = { id: 't1', kind: 'turno' as const, date: '2026-10-01', start: '07:00', end: '19:00', minutes: 720 };
    s.atualizar((db) => ({ ...db, entries: [turno] }), 'lançar');
    // 2ª sessão: "registros" não cabe mais; o turno é apagado.
    vi.resetModules();
    cheioV1 = true;
    s = await import('./store');
    expect(s.getEscala().entries).toHaveLength(1);
    s.atualizar((db) => ({ ...db, entries: [] }), 'apagar');
    // 3ª sessão: reabre o app.
    vi.resetModules();
    s = await import('./store');
    expect(s.getEscala().entries).toHaveLength(0);
  });

  it('primeira falha de gravação num desfazer já mostra o aviso', async () => {
    const { toast } = await import('../../components/toast');
    vi.mocked(toast).mockClear();
    let cheio = false;
    const dados = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (cheio) throw new DOMException('quota', 'QuotaExceededError');
        dados.set(k, v);
      },
      removeItem: (k: string) => void dados.delete(k),
    });
    vi.resetModules();
    const s = await import('./store');
    s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar');
    cheio = true;
    expect(s.desfazer()).toBe('lançar');
    expect(s.emModoTemporario()).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('cota cheia no meio da sessão: a leitura usa o valor da memória', async () => {
    const { K_V2 } = await import('./store');
    const { dbVazio } = await import('./model');
    const antigo = JSON.stringify(dbVazio('2020-01-01T00:00:00.000Z'));
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k === K_V2 ? antigo : null),
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    });
    vi.resetModules();
    const s = await import('./store');
    s.atualizar((db) => ({ ...db, entries: [...db.entries] }), 'lançar');
    const lido = s.lerChave(s.K_V2);
    expect(lido).not.toBe(antigo);
    expect(JSON.parse(lido!).meta.atualizadoEm).toBe(s.getEscala().meta.atualizadoEm);
  });
});
