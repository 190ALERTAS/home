import { describe, expect, it } from 'vitest';
import { metrosPorPixel } from './mapa';
import { comprimentoLinha, formatMetros } from './glyphs';
import { novaLinha, novaVia, novoSimbolo, novoVeiculo, ordemDesenho, proximoVeiculo, tamanhoPalco } from './elementos';
import { dimensoes, dimensoesVia, type Elemento } from './model';

describe('escala do mapa', () => {
  it('metros por pixel no zoom 20 em Porto Alegre ≈ 0,13 m', () => {
    const m = metrosPorPixel(-30.03, 20);
    expect(m).toBeGreaterThan(0.12);
    expect(m).toBeLessThan(0.14);
    // cada nível de zoom divide por 2
    expect(metrosPorPixel(-30.03, 19) / m).toBeCloseTo(2, 5);
  });

  it('um automóvel ocupa 4,5 m × 1,8 m em escala real', () => {
    const mpu = 0.1;
    const carro = novoVeiculo('automovel', 0, 0, []);
    expect(tamanhoPalco(carro, mpu)).toEqual({ w: 45, h: 18 });
    expect(tamanhoPalco({ ...carro, escala: 2 }, mpu)).toEqual({ w: 90, h: 36 });
  });
});

describe('elementos', () => {
  it('numera veículos V1, V2... reaproveitando rótulos livres', () => {
    const v1 = novoVeiculo('automovel', 0, 0, []);
    const v2 = novoVeiculo('moto', 0, 0, [v1]);
    expect([v1.rotulo, v2.rotulo]).toEqual(['V1', 'V2']);
    expect(v1.cor).not.toBe(v2.cor);
    expect(proximoVeiculo([v2]).rotulo).toBe('V1');
  });

  it('vias ficam sempre por baixo dos demais itens', () => {
    const els: Elemento[] = [novoVeiculo('automovel', 0, 0, []), novaVia('reta', 0, 0), novoSimbolo('impacto', 0, 0)];
    expect(ordemDesenho(els).map((e) => e.kind)).toEqual(['via', 'veiculo', 'simbolo']);
  });

  it('dimensões de vias e veículo tombado (vista lateral)', () => {
    expect(dimensoesVia({ tipo: 'reta', comprimento: 30, faixas: 2 })).toEqual({ w: 30, h: 7 });
    expect(dimensoesVia({ tipo: 'cruzamento', comprimento: 30, faixas: 4 })).toEqual({ w: 30, h: 30 });
    const tombado = { ...novoVeiculo('automovel', 0, 0, []), estado: 'tombado' as const };
    expect(dimensoes(tombado)).toEqual({ w: 4.5, h: 1.5 });
  });
});

describe('medidas', () => {
  it('mede linhas retas e curvas', () => {
    const mpu = 0.05;
    const reta = novaLinha('medida', 100, 100, mpu, 10);
    expect(comprimentoLinha(reta) * mpu).toBeCloseTo(10, 5);
    const curva = { ...reta, cx: 100, cy: 0 };
    expect(comprimentoLinha(curva) * mpu).toBeGreaterThan(10);
    expect(formatMetros(12.345)).toBe('12,3 m');
  });
});
