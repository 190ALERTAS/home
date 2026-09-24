import { describe, expect, it } from 'vitest';
import { metrosPorPixel } from './mapa';
import {
  caixaDaArea,
  classeVia,
  consultaOverpass,
  doMundo,
  larguraVia,
  maoVia,
  montarTracado,
  paraMundo,
  trechosDentro,
  type Area,
  type WayOSM,
} from './tracado';

const LAT = -29.6385;
const LNG = -51.0095;
const ZOOM = 19;
const centro = paraMundo(LAT, LNG, ZOOM);
const AREA: Area = {
  zoom: ZOOM,
  origem: { x: centro.x - 200, y: centro.y - 300 },
  largura: 400,
  altura: 600,
  mpu: metrosPorPixel(LAT, ZOOM),
};

/** Ponto do palco (unidades) → coordenada geográfica, como viria do OpenStreetMap. */
const ll = (x: number, y: number) => {
  const g = doMundo(AREA.origem.x + x, AREA.origem.y + y, ZOOM);
  return { lat: g.lat, lon: g.lng };
};
const via = (id: number, nos: [number, number, number][], tags: Record<string, string>): WayOSM => ({
  type: 'way',
  id,
  nodes: nos.map((n) => n[0]),
  geometry: nos.map((n) => ll(n[1], n[2])),
  tags,
});

// Quadra fictícia: avenida (N-S) cruzando a Rua Itabuna (L-O) no nó 2.
const DADOS = {
  elements: [
    via(1, [[1, -100, 300], [2, 200, 300], [3, 500, 300]], { highway: 'residential', name: 'Rua Itabuna' }),
    via(2, [[4, 200, -100], [2, 200, 300], [5, 200, 700]], { highway: 'primary', name: 'Avenida João Corrêa', lanes: '4' }),
    via(3, [[6, -50, 100], [7, 150, 100]], { highway: 'residential', name: 'Rua Sete de Setembro', oneway: '-1' }),
    via(4, [[8, 250, 500], [9, 350, 500]], { highway: 'residential', name: 'Rua A' }),
    via(5, [[9, 350, 500], [10, 450, 500]], { highway: 'residential', name: 'Rua A' }),
    via(6, [[11, 20, 420], [12, 180, 420]], { highway: 'residential', oneway: 'yes' }),
    via(7, [[13, 20, 550], [14, 120, 580]], { highway: 'track', name: 'Estrada Velha' }),
    via(8, [[15, 0, 0], [16, 100, 100]], { highway: 'primary', tunnel: 'yes' }),
    via(9, [[17, 0, 50], [18, 100, 50]], { highway: 'footway' }),
    { type: 'node', id: 99 },
  ] as WayOSM[],
};

describe('projeção', () => {
  it('ida e volta entre coordenadas e pixels do mundo', () => {
    const p = paraMundo(LAT, LNG, ZOOM);
    const g = doMundo(p.x, p.y, ZOOM);
    expect(g.lat).toBeCloseTo(LAT, 9);
    expect(g.lng).toBeCloseTo(LNG, 9);
  });

  it('a caixa da consulta cobre o palco com folga', () => {
    const c = caixaDaArea(AREA);
    const no = ll(0, 0);
    const se = ll(400, 600);
    expect(c.n).toBeGreaterThan(no.lat);
    expect(c.w).toBeLessThan(no.lon);
    expect(c.s).toBeLessThan(se.lat);
    expect(c.e).toBeGreaterThan(se.lon);
    expect(consultaOverpass(c)).toMatch(/^\[out:json\].*way\["highway"~".*residential.*"\]\(-29\.\d+,-51\.\d+,-29\.\d+,-51\.\d+\);out body geom qt;$/);
  });
});

describe('atributos das vias', () => {
  it('classifica, estima a largura e a mão', () => {
    expect(classeVia({ highway: 'residential' })).toBe('local');
    expect(classeVia({ highway: 'residential', surface: 'dirt' })).toBe('terra');
    expect(classeVia({ highway: 'primary_link' })).toBe('principal');
    expect(classeVia({ highway: 'trunk' })).toBe('rodovia');
    expect(classeVia({ highway: 'service' })).toBe('servico');
    expect(larguraVia({ highway: 'residential' })).toBe(7);
    expect(larguraVia({ highway: 'primary', lanes: '4' })).toBeCloseTo(13.8);
    expect(larguraVia({ highway: 'service', width: '3,5' })).toBe(3.5);
    expect(maoVia({ highway: 'residential' })).toBe('dupla');
    expect(maoVia({ highway: 'residential', oneway: '-1' })).toBe('unica');
    expect(maoVia({ highway: 'tertiary', junction: 'roundabout' })).toBe('unica');
  });

  it('recorta a linha ao palco, separando os trechos visíveis', () => {
    const runs = trechosDentro(
      [
        { x: -50, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 200 },
        { x: 120, y: 200 },
      ],
      100,
      100,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0][0]).toEqual({ x: 0, y: 10 });
    expect(runs[0][runs[0].length - 1]).toEqual({ x: 50, y: 100 });
  });
});

describe('montarTracado', () => {
  const t = montarTracado(DADOS, AREA);
  const xy = (pts: number[], i: number) => [pts[i * 2], pts[i * 2 + 1]];

  it('desenha só vias de superfície, ignorando túneis, calçadas e outros elementos', () => {
    expect(t.vias).toHaveLength(7);
    expect(t.vias.map((v) => v.classe)).toEqual(['local', 'principal', 'local', 'local', 'local', 'local', 'terra']);
    const av = t.vias[1];
    expect(av.largura).toBeCloseTo(13.8);
    expect(av.calcada).toBe(2.5);
    expect(t.vias[6].calcada).toBe(0);
  });

  it('marca como interseção só os nós onde as ruas se cruzam (não a emenda da mesma rua)', () => {
    expect(t.cruzamentos).toHaveLength(1);
    const [c] = t.cruzamentos;
    expect(c.x).toBeCloseTo(200, 0);
    expect(c.y).toBeCloseTo(300, 0);
    expect(c.r).toBeCloseTo(13.8 / 2 + 0.2);
    expect(c.classe).toBe('principal');
  });

  it('mão única no sentido contrário: o traçado segue o sentido do tráfego', () => {
    const [x0, y0] = xy(t.vias[2].pts, 0);
    expect(x0).toBeCloseTo(150, 0);
    expect(y0).toBeCloseTo(100, 0);
    expect(t.vias[2].mao).toBe('unica');
  });

  it('um nome por rua, legível (da esquerda para a direita; ruas verticais de baixo para cima)', () => {
    const nomes = t.rotulos.map((r) => r.texto).sort();
    expect(nomes).toEqual(['Avenida João Corrêa', 'Rua A', 'Rua Itabuna', 'Rua Sete de Setembro']);
    const itabuna = t.rotulos.find((r) => r.texto === 'Rua Itabuna')!;
    expect(itabuna.pts[0]).toBeLessThan(itabuna.pts[itabuna.pts.length - 2]);
    // dentro do palco e fora do cruzamento com a avenida (x = 200)
    const xs = itabuna.pts.filter((_, i) => i % 2 === 0);
    const raio = t.cruzamentos[0].r / AREA.mpu;
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(400);
    expect(Math.min(...xs) > 200 + raio || Math.max(...xs) < 200 - raio).toBe(true);
    const av = t.rotulos.find((r) => r.texto === 'Avenida João Corrêa')!;
    expect(av.pts[1]).toBeGreaterThan(av.pts[av.pts.length - 1]);
    const sete = t.rotulos.find((r) => r.texto === 'Rua Sete de Setembro')!;
    expect(sete.pts[0]).toBeLessThan(sete.pts[sete.pts.length - 2]);
    // estrada de terra não recebe nome em cima do chão batido
    expect(nomes).not.toContain('Estrada Velha');
  });

  it('setas de mão única no sentido do tráfego, longe dos nomes e cruzamentos', () => {
    expect(t.setas.length).toBeGreaterThan(0);
    for (const s of t.setas) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(400);
      expect(Math.hypot(s.x - 200, s.y - 300)).toBeGreaterThan(20);
    }
    const naRuaSemNome = t.setas.filter((s) => Math.abs(s.y - 420) < 1);
    expect(naRuaSemNome.length).toBeGreaterThan(0);
    expect(naRuaSemNome.every((s) => Math.abs(s.ang) < 1)).toBe(true);
  });
});
