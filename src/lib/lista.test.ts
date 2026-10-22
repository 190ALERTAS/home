import { describe, expect, it } from 'vitest';
import { moverItem } from './lista';

describe('moverItem', () => {
  it('troca o item com o vizinho na direção pedida', () => {
    expect(moverItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moverItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });

  it('não altera a lista quando o destino sai dos limites', () => {
    const lista = ['a', 'b', 'c'];
    expect(moverItem(lista, 0, -1)).toBe(lista);
    expect(moverItem(lista, 2, 1)).toBe(lista);
    expect(moverItem(lista, 5, 1)).toBe(lista);
  });

  it('devolve uma lista nova sem mexer na original', () => {
    const lista = ['a', 'b'];
    const nova = moverItem(lista, 0, 1);
    expect(nova).not.toBe(lista);
    expect(lista).toEqual(['a', 'b']);
  });
});
