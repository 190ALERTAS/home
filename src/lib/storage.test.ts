import { describe, expect, it } from 'vitest';
import { envelopeParaGravar, envelopeValido } from './storage';

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

describe('rascunho guardado ainda vale?', () => {
  it('valor vencido volta ao inicial', () => {
    expect(envelopeValido({ v: 1, t: 0 }, 1001, 1000)).toBe(false);
  });

  it('dentro do prazo vale', () => {
    expect(envelopeValido({ v: 1, t: 0 }, 1000, 1000)).toBe(true);
  });

  it('sem prazo, vale sempre; sem envelope, nunca', () => {
    expect(envelopeValido({ v: 1, t: 0 }, 10 ** 12)).toBe(true);
    expect(envelopeValido(null, 0, 1000)).toBe(false);
    expect(envelopeValido({ x: 1 }, 0, 1000)).toBe(false);
  });
});
