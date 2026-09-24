/**
 * Traçado plano das vias a partir dos dados abertos do OpenStreetMap (Overpass API).
 *
 * Em vez da imagem de satélite (que pixela ao aproximar), o croqui recebe a geometria
 * real das ruas do local escolhido e as desenha em vetor: pista, calçada, pintura,
 * mão única e nomes — nítido em qualquer zoom e sem vegetação ou construções.
 */
import type { ClasseVia, Cruzamento, FundoTracado, RotuloMapa, ViaMapa } from './model';

export const SERVIDORES_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const TIPOS = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'living_street',
  'service',
  'pedestrian',
  'track',
  'road',
  'busway',
  'motorway_link',
  'trunk_link',
  'primary_link',
  'secondary_link',
  'tertiary_link',
];

/* ---------- Projeção (Web Mercator, tiles de 256 px — o mesmo do mapa) ---------- */

export function paraMundo(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const escala = 256 * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * escala,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * escala,
  };
}

export function doMundo(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const escala = 256 * 2 ** zoom;
  const lng = (x / escala) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / escala;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/* ---------- Consulta ---------- */

export interface Area {
  zoom: number;
  /** canto superior esquerdo do palco, em pixels do mundo no `zoom` */
  origem: { x: number; y: number };
  largura: number;
  altura: number;
  /** metros por unidade do palco */
  mpu: number;
}

/** Retângulo (sul, oeste, norte, leste) do palco com uma folga em volta. */
export function caixaDaArea(a: Area, folga = 0.3): { s: number; w: number; n: number; e: number } {
  const fx = a.largura * folga;
  const fy = a.altura * folga;
  const no = doMundo(a.origem.x - fx, a.origem.y - fy, a.zoom);
  const se = doMundo(a.origem.x + a.largura + fx, a.origem.y + a.altura + fy, a.zoom);
  return { s: se.lat, w: no.lng, n: no.lat, e: se.lng };
}

export function consultaOverpass(c: { s: number; w: number; n: number; e: number }): string {
  const f = (v: number) => v.toFixed(6);
  return `[out:json][timeout:20];way["highway"~"^(${TIPOS.join('|')})$"](${f(c.s)},${f(c.w)},${f(c.n)},${f(c.e)});out body geom qt;`;
}

export interface WayOSM {
  type: string;
  id: number;
  nodes?: number[];
  geometry?: ({ lat: number; lon: number } | null)[];
  tags?: Record<string, string>;
}

/** Busca as vias no Overpass, tentando outro servidor se um falhar. */
export async function buscarVias(c: { s: number; w: number; n: number; e: number }): Promise<{ elements: WayOSM[] }> {
  const corpo = new URLSearchParams({ data: consultaOverpass(c) });
  let erro: unknown = null;
  for (const url of SERVIDORES_OVERPASS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(url, { method: 'POST', body: corpo, signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const dados = (await r.json()) as { elements?: WayOSM[] };
      return { elements: Array.isArray(dados.elements) ? dados.elements : [] };
    } catch (e) {
      erro = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw erro ?? new Error('Overpass indisponível');
}

/* ---------- Atributos das vias ---------- */

const SEM_PAVIMENTO = new Set(['unpaved', 'dirt', 'earth', 'ground', 'gravel', 'fine_gravel', 'sand', 'compacted', 'grass', 'mud', 'pebblestone']);

export function classeVia(tags: Record<string, string>): ClasseVia {
  const h = tags.highway ?? '';
  if (h === 'track' || SEM_PAVIMENTO.has(tags.surface ?? '')) return 'terra';
  if (h === 'pedestrian') return 'pedestre';
  if (h === 'service' || h === 'living_street') return 'servico';
  if (/^(motorway|trunk)/.test(h)) return 'rodovia';
  if (/^(primary|secondary)/.test(h)) return 'principal';
  return 'local';
}

const LARGURA_PADRAO: Record<string, number> = {
  motorway: 11,
  trunk: 10,
  primary: 10,
  secondary: 9,
  tertiary: 8,
  unclassified: 7,
  residential: 7,
  road: 7,
  busway: 7,
  living_street: 6,
  service: 4.5,
  pedestrian: 5,
  track: 3.5,
};

function numero(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Faixas de rolamento (informadas no mapa ou estimadas pelo tipo da via). */
export function faixasVia(tags: Record<string, string>): number {
  const n = numero(tags.lanes);
  if (n) return Math.min(8, Math.round(n));
  const h = (tags.highway ?? '').replace('_link', '');
  if (h === 'motorway' || h === 'trunk') return 2;
  return maoVia(tags) === 'unica' ? 1 : 2;
}

/** Largura da pista em metros. */
export function larguraVia(tags: Record<string, string>): number {
  const w = numero(tags.width);
  if (w) return Math.min(30, Math.max(2.5, w));
  const h = tags.highway ?? '';
  if (numero(tags.lanes)) return Math.max(3.2, faixasVia(tags) * 3.3 + 0.6);
  if (h.endsWith('_link')) return 6;
  return LARGURA_PADRAO[h] ?? 7;
}

export function maoVia(tags: Record<string, string>): 'dupla' | 'unica' {
  const o = tags.oneway;
  if (o === 'yes' || o === 'true' || o === '1' || o === '-1' || tags.junction === 'roundabout') return 'unica';
  if (/^motorway/.test(tags.highway ?? '') && o !== 'no') return 'unica';
  return 'dupla';
}

/** Calçada de cada lado (m): só em vias urbanas pavimentadas. */
export function calcadaVia(classe: ClasseVia): number {
  return classe === 'local' || classe === 'principal' ? 2.5 : 0;
}

/* ---------- Geometria ---------- */

type P = { x: number; y: number };

/** Recorta o segmento ao retângulo [0,W]×[0,H] (Liang–Barsky). */
function recortar(a: P, b: P, W: number, H: number): [P, P] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const testes: [number, number][] = [
    [-dx, a.x],
    [dx, W - a.x],
    [-dy, a.y],
    [dy, H - a.y],
  ];
  for (const [p, q] of testes) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

const dist = (a: P, b: P) => Math.hypot(b.x - a.x, b.y - a.y);

/** Trechos contínuos da linha que ficam dentro do retângulo. */
export function trechosDentro(pts: P[], W: number, H: number): P[][] {
  const runs: P[][] = [];
  let atual: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const c = recortar(pts[i], pts[i + 1], W, H);
    if (!c) {
      if (atual.length > 1) runs.push(atual);
      atual = [];
      continue;
    }
    const [a, b] = c;
    if (atual.length && dist(atual[atual.length - 1], a) < 1e-6) atual.push(b);
    else {
      if (atual.length > 1) runs.push(atual);
      atual = [a, b];
    }
  }
  if (atual.length > 1) runs.push(atual);
  return runs;
}

const comprimento = (pts: P[]) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

/** Ponto e direção a uma distância `d` ao longo da linha. */
function pontoEm(pts: P[], d: number): { p: P; ang: number } {
  let resto = d;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = dist(pts[i], pts[i + 1]);
    if (resto <= seg || i === pts.length - 2) {
      const t = seg ? Math.min(1, resto / seg) : 0;
      return {
        p: { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t },
        ang: (Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) * 180) / Math.PI,
      };
    }
    resto -= seg;
  }
  return { p: pts[0], ang: 0 };
}

const achatar = (pts: P[]) => pts.flatMap((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);

/** Parte da linha entre as distâncias `a` e `b` (medidas a partir do início). */
function subLinha(pts: P[], a: number, b: number): P[] {
  const out: P[] = [pontoEm(pts, a).p];
  let acum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    acum += dist(pts[i], pts[i + 1]);
    if (acum > a && acum < b) out.push(pts[i + 1]);
  }
  out.push(pontoEm(pts, b).p);
  return out;
}

/* ---------- Montagem ---------- */

export function montarTracado(dados: { elements: WayOSM[] }, a: Area): Omit<FundoTracado, 'tipo' | 'lat' | 'lng' | 'zoom'> {
  const u = 1 / a.mpu; // unidades por metro
  const vias: ViaMapa[] = [];
  const grau = new Map<number, { p: P; grau: number; largura: number; classe: ClasseVia }>();
  const porNome = new Map<string, { runs: P[][]; tam: number; classe: ClasseVia }>();
  const setas: { x: number; y: number; ang: number }[] = [];
  const setaCandidatas: { runs: P[][] }[] = [];

  for (const el of dados.elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    const tags = el.tags ?? {};
    if (!TIPOS.includes(tags.highway ?? '') || tags.area === 'yes') continue;
    if (tags.tunnel && tags.tunnel !== 'no') continue;
    let pts: P[] = [];
    let nos: (number | undefined)[] = [];
    el.geometry.forEach((g, i) => {
      if (!g) return;
      const w = paraMundo(g.lat, g.lon, a.zoom);
      pts.push({ x: w.x - a.origem.x, y: w.y - a.origem.y });
      nos.push(el.nodes?.[i]);
    });
    if (pts.length < 2) continue;
    // Mão única no sentido contrário ao desenho da via: inverte para as setas seguirem o tráfego.
    if (tags.oneway === '-1') {
      pts = pts.reverse();
      nos = nos.reverse();
    }
    const classe = classeVia(tags);
    const largura = larguraVia(tags);
    const mao = maoVia(tags);
    vias.push({ pts: achatar(pts), largura, calcada: calcadaVia(classe), classe, mao, faixas: faixasVia(tags) });

    // Grau dos nós: extremidades contam 1, pontos intermediários contam 2.
    nos.forEach((id, i) => {
      if (id == null) return;
      const g = grau.get(id) ?? { p: pts[i], grau: 0, largura: 0, classe };
      g.grau += i === 0 || i === nos.length - 1 ? 1 : 2;
      if (largura > g.largura) {
        g.largura = largura;
        g.classe = classe;
      }
      grau.set(id, g);
    });

    const runs = trechosDentro(pts, a.largura, a.altura);
    const nome = tags.name?.trim();
    if (nome && classe !== 'terra' && runs.length) {
      const tam = Math.min(3.2, Math.max(1.5, largura * 0.34));
      const r = porNome.get(nome) ?? { runs: [], tam, classe };
      r.runs.push(...runs);
      r.tam = Math.max(r.tam, tam);
      porNome.set(nome, r);
    }
    if (mao === 'unica' && runs.length) setaCandidatas.push({ runs });
  }

  const cruzamentos: Cruzamento[] = [];
  for (const g of grau.values()) {
    if (g.grau >= 3) {
      cruzamentos.push({ x: Math.round(g.p.x * 10) / 10, y: Math.round(g.p.y * 10) / 10, r: g.largura / 2 + 0.2, classe: g.classe });
    }
  }

  // Nomes: um por rua, no trecho visível mais longo, sempre na leitura da esquerda para a
  // direita, fora dos cruzamentos e sem encostar no nome de outra rua.
  const rotulos: RotuloMapa[] = [];
  const centrosRotulo: { p: P; raio: number }[] = [];
  const ruas = [...porNome].sort((x, y) => y[1].tam - x[1].tam);
  for (const [texto, info] of ruas) {
    const run = info.runs.reduce((m, r) => (comprimento(r) > comprimento(m) ? r : m), info.runs[0]);
    const len = comprimento(run);
    const precisa = (texto.length * 0.6 + 2) * info.tam * u;
    if (len < precisa) continue;
    let pts = run;
    const dx = pts[pts.length - 1].x - pts[0].x;
    const dy = pts[pts.length - 1].y - pts[0].y;
    // Ruas quase verticais: texto de baixo para cima; demais: da esquerda para a direita.
    const quaseVertical = Math.abs(dx) < Math.abs(dy) * 0.1;
    if (quaseVertical ? dy > 0 : dx < 0) pts = [...pts].reverse();
    const livre = (d: number) => {
      if (d - precisa / 2 < 0 || d + precisa / 2 > len) return false;
      for (let k = 0; k <= 8; k++) {
        const q = pontoEm(pts, d - precisa / 2 + (precisa * k) / 8).p;
        if (cruzamentos.some((c) => dist(c, q) < (c.r + info.tam * 0.6) * u)) return false;
        if (centrosRotulo.some((r) => dist(r.p, q) < r.raio)) return false;
      }
      return true;
    };
    const d = [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85].map((f) => f * len).find(livre);
    if (d === undefined) continue;
    rotulos.push({ texto, pts: achatar(subLinha(pts, d - precisa / 2, d + precisa / 2)), tam: info.tam });
    centrosRotulo.push({ p: pontoEm(pts, d).p, raio: precisa / 2 + 3 * u });
  }

  // Setas de mão única a cada ~28 m, longe dos nomes.
  const passo = 28 * u;
  for (const c of setaCandidatas) {
    for (const run of c.runs) {
      const len = comprimento(run);
      for (let d = passo / 2; d < len; d += passo) {
        const { p, ang } = pontoEm(run, d);
        if (p.x < 6 * u || p.y < 6 * u || p.x > a.largura - 6 * u || p.y > a.altura - 6 * u) continue;
        if (centrosRotulo.some((r) => dist(r.p, p) < r.raio)) continue;
        if (cruzamentos.some((k) => dist(k, p) < (k.r + 4) * u)) continue;
        setas.push({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, ang: Math.round(ang) });
      }
    }
  }

  return { vias, cruzamentos, rotulos, setas };
}
