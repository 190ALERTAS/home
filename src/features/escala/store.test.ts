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
