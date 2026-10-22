import { describe, expect, it, vi } from 'vitest';
import { criarTelas } from './telas';

const Escala = () => null;
const Taf = () => null;

describe('telas carregadas sob demanda', () => {
  it('depois de carregada, a tela é usada direto (sem suspender e mostrar o "carregando")', async () => {
    const t = criarTelas({ escala: async () => ({ default: Escala }) });
    expect(t.pronta('escala')).toBeUndefined();
    await t.carregar('escala');
    expect(t.pronta('escala')).toBe(Escala);
  });

  it('pedidos ao mesmo tempo baixam uma vez só', async () => {
    const load = vi.fn(async () => ({ default: Taf }));
    const t = criarTelas({ taf: load });
    await Promise.all([t.carregar('taf'), t.carregar('taf'), t.carregar('taf')]);
    await t.carregar('taf');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('falha ao baixar (sem internet) pode tentar de novo depois', async () => {
    let falhar = true;
    const t = criarTelas({ taf: async () => (falhar ? Promise.reject(new Error('offline')) : { default: Taf }) });
    await expect(t.carregar('taf')).rejects.toThrow('offline');
    falhar = false;
    await t.carregar('taf');
    expect(t.pronta('taf')).toBe(Taf);
  });

  it('tela que já vem no pacote principal está sempre pronta', async () => {
    const t = criarTelas({ escala: async () => ({ default: Escala }) });
    await expect(t.carregar('release')).resolves.toBeUndefined();
    expect(t.pronta('release')).toBeUndefined();
    expect(t.estaPronta('release')).toBe(true);
    expect(t.estaPronta('escala')).toBe(false);
    await t.carregar('escala');
    expect(t.estaPronta('escala')).toBe(true);
  });

  it('carregarTodas baixa todas e ignora falhas', async () => {
    const t = criarTelas({ escala: async () => ({ default: Escala }), taf: () => Promise.reject(new Error('x')) });
    await t.carregarTodas();
    expect(t.pronta('escala')).toBe(Escala);
    expect(t.pronta('taf')).toBeUndefined();
  });
});
