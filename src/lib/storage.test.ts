import { describe, expect, it } from 'vitest';
import { envelopeParaGravar } from './storage';

describe('prazo do rascunho', () => {
  it('abrir a tela com o rascunho guardado não renova o prazo', () => {
    expect(envelopeParaGravar({ v: { a: 1 }, t: 100 }, { a: 1 }, 999)).toBeNull();
  });

  it('editar renova', () => {
    expect(envelopeParaGravar({ v: { a: 1 }, t: 100 }, { a: 2 }, 999)).toEqual({ v: { a: 2 }, t: 999 });
  });

  it('sem nada guardado (ou lixo), grava com a hora atual', () => {
    expect(envelopeParaGravar(null, { a: 1 }, 5)).toEqual({ v: { a: 1 }, t: 5 });
    expect(envelopeParaGravar('x', { a: 1 }, 5)).toEqual({ v: { a: 1 }, t: 5 });
  });
});
