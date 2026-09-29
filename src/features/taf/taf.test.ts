import { describe, expect, it } from 'vitest';
import { conceito, exercicios, faixaPorIdade, pontuar } from './calc';
import { TABELA } from './tabela';

describe('tabela do TAF', () => {
  it('tem os três exercícios em todas as categorias (barra até 35 anos, apoio depois)', () => {
    for (const sexo of ['M', 'F'] as const) {
      for (const faixa of [1, 2, 3, 4, 5] as const) {
        const ex = exercicios(TABELA, sexo, faixa);
        expect(ex).toHaveLength(3);
        expect(ex).toContain(faixa <= 2 ? 'barra' : 'apoio');
      }
    }
  });

  it('corrige a digitação da corrida feminina (2050 m)', () => {
    for (const faixa of [1, 2, 3, 4, 5]) {
      const corrida = TABELA.F[faixa].corrida!;
      const indices = corrida.map(([m]) => m);
      expect(indices).toContain(2050);
      for (let i = 1; i < indices.length; i++) expect(indices[i] - indices[i - 1]).toBe(50);
    }
  });

  it('pontua pelo maior índice alcançado', () => {
    const abd = TABELA.M[1].abdominal!;
    expect(pontuar(abd, 30, 75).pontos).toBe(0);
    expect(pontuar(abd, 31, 75).pontos).toBe(1);
    expect(pontuar(abd, 32, 75)).toMatchObject({ pontos: 1, proximo: { valor: 33, pontos: 10 } });
    expect(pontuar(abd, 60, 75).pontos).toBe(75);
    expect(pontuar(TABELA.M[1].corrida!, 2900, 150).pontos).toBe(150);
    expect(pontuar(TABELA.F[1].barra!, 26, 75).pontos).toBe(50);
  });

  it('classifica o conceito', () => {
    expect(conceito(300)).toBe('EXCELENTE');
    expect(conceito(255)).toBe('MUITO BOM');
    expect(conceito(211)).toBe('BOM');
    expect(conceito(151)).toBe('REGULAR');
    expect(conceito(150)).toBe('INSUFICIENTE');
  });

  it('faixa etária pela idade', () => {
    expect([20, 27, 28, 35, 36, 44, 45, 50, 51].map(faixaPorIdade)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });
});
