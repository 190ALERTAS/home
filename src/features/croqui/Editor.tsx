import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type PointerEvent as RPointerEvent } from 'react';
import { ElementoSVG, LinhaSVG } from './glyphs';
import { FundoTracadoSVG } from './FundoTracado';
import { ordemDesenho, tamanhoPalco } from './elementos';
import type { CroquiDoc, Elemento, ElementoPontual, LinhaEl } from './model';

export interface EditorApi {
  /** Centro da área visível, em unidades de palco. */
  centro(): { x: number; y: number };
  ajustar(): void;
  zoom(fator: number): void;
  svg(): SVGSVGElement | null;
}

type Gesto =
  | { t: 'pan'; sx: number; sy: number; cx: number; cy: number; moveu: boolean; tocouVia: string | null }
  | { t: 'pinca'; d0: number; k0: number; mx: number; my: number; cx0: number; cy0: number }
  | { t: 'mover'; id: string; dx: number; dy: number; alterou: boolean }
  | { t: 'mover-linha'; id: string; sx: number; sy: number; orig: LinhaEl; alterou: boolean }
  | { t: 'girar'; id: string; alterou: boolean }
  | { t: 'escalar'; id: string; d0: number; e0: number; alterou: boolean }
  | { t: 'ponto'; id: string; qual: 'p1' | 'p2' | 'c'; alterou: boolean };

interface Props {
  doc: CroquiDoc;
  fundoUrl: string | null;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  onAlterar: (elementos: Elemento[], confirmar: boolean) => void;
  apiRef: MutableRefObject<EditorApi | null>;
}

const COR_SEL = '#ff2d44';

function ajustarAngulo(graus: number): number {
  let a = ((graus % 360) + 360) % 360;
  const alvo = Math.round(a / 15) * 15;
  if (Math.abs(a - alvo) < 4) a = alvo % 360;
  return Math.round(a);
}

export function Editor({ doc, fundoUrl, selecionado, onSelecionar, onAlterar, apiRef }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [cam, setCam] = useState({ x: 0, y: 0, k: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const docRef = useRef(doc);
  docRef.current = doc;
  const selRef = useRef(selecionado);
  selRef.current = selecionado;
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<Gesto | null>(null);
  /** Resultado mais recente do gesto (o estado do React pode estar um quadro atrasado). */
  const ultimos = useRef<Elemento[] | null>(null);
  const ajustado = useRef(false);

  const kAjuste = useCallback(
    (w = tam.w, h = tam.h) => Math.min(w / doc.largura, h / doc.altura) * 0.96,
    [tam.w, tam.h, doc.largura, doc.altura],
  );

  const ajustar = useCallback(() => {
    if (!tam.w || !tam.h) return;
    const k = kAjuste();
    setCam({ k, x: (doc.largura - tam.w / k) / 2, y: (doc.altura - tam.h / k) / 2 });
  }, [tam.w, tam.h, kAjuste, doc.largura, doc.altura]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setTam({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (tam.w && tam.h && !ajustado.current) {
      ajustado.current = true;
      ajustar();
    }
  }, [tam.w, tam.h, ajustar]);

  const limitarK = useCallback(
    (k: number) => {
      const base = kAjuste();
      return Math.min(base * 14, Math.max(base * 0.4, k));
    },
    [kAjuste],
  );

  const zoomEm = useCallback(
    (fator: number, sx: number, sy: number) => {
      const c = camRef.current;
      const k = limitarK(c.k * fator);
      const px = c.x + sx / c.k;
      const py = c.y + sy / c.k;
      setCam({ k, x: px - sx / k, y: py - sy / k });
    },
    [limitarK],
  );

  useEffect(() => {
    apiRef.current = {
      centro: () => {
        const c = camRef.current;
        const x = c.x + tam.w / c.k / 2;
        // Um pouco acima do centro: no celular o painel ocupa a parte de baixo.
        const y = c.y + (tam.h / c.k) * (tam.w < 700 ? 0.36 : 0.5);
        return {
          x: Math.min(doc.largura, Math.max(0, x)),
          y: Math.min(doc.altura, Math.max(0, y)),
        };
      },
      ajustar,
      zoom: (f) => zoomEm(f, tam.w / 2, tam.h / 2),
      svg: () => svgRef.current,
    };
  }, [apiRef, ajustar, zoomEm, tam.w, tam.h, doc.largura, doc.altura]);

  // Roda do mouse: zoom no ponto do cursor (listener não-passivo).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomEm(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomEm]);

  const noPalco = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const c = camRef.current;
    return { x: c.x + (clientX - r.left) / c.k, y: c.y + (clientY - r.top) / c.k };
  };

  const atualizarEl = (id: string, fn: (el: Elemento) => Elemento) => {
    const base = ultimos.current ?? docRef.current.elementos;
    const novos = base.map((e) => (e.id === id ? fn(e) : e));
    ultimos.current = novos;
    onAlterar(novos, false);
  };

  const confirmarGesto = () => {
    onAlterar(ultimos.current ?? docRef.current.elementos, true);
    ultimos.current = null;
  };

  const iniciarPinca = () => {
    const [a, b] = [...ponteiros.current.values()];
    const r = svgRef.current!.getBoundingClientRect();
    const c = camRef.current;
    const mx = (a.x + b.x) / 2 - r.left;
    const my = (a.y + b.y) / 2 - r.top;
    // Encerra qualquer arrasto em andamento, preservando a posição atual.
    const g = gesto.current;
    if (g && 'alterou' in g && g.alterou) confirmarGesto();
    gesto.current = { t: 'pinca', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: c.k, mx, my, cx0: c.x + mx / c.k, cy0: c.y + my / c.k };
  };

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    ultimos.current = null;
    svgRef.current?.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 2) return iniciarPinca();
    if (ponteiros.current.size > 2) return;

    const alvo = e.target as Element;
    const handle = alvo.closest('[data-handle]')?.getAttribute('data-handle');
    const hitId = alvo.closest('[data-hit]')?.getAttribute('data-hit') ?? null;
    const p = noPalco(e.clientX, e.clientY);
    const sel = selRef.current;
    const els = docRef.current.elementos;
    const c = camRef.current;

    if (handle && sel) {
      const el = els.find((x) => x.id === sel);
      if (!el) return;
      if (handle === 'girar') gesto.current = { t: 'girar', id: sel, alterou: false };
      else if (handle === 'escalar' && el.kind !== 'linha') {
        // Distância do centro até a alça (não até o dedo), para o redimensionamento ser estável.
        const { w, h } = tamanhoPalco(el, docRef.current.metrosPorUnidade);
        const caixa = caixaSelecao(w, h, c.k);
        gesto.current = { t: 'escalar', id: sel, d0: Math.hypot(caixa.W / 2, caixa.H / 2) || 1, e0: el.escala, alterou: false };
      } else if (handle === 'p1' || handle === 'p2' || handle === 'c') gesto.current = { t: 'ponto', id: sel, qual: handle, alterou: false };
      return;
    }

    if (hitId) {
      const el = els.find((x) => x.id === hitId);
      if (el && (el.kind !== 'via' || sel === hitId)) {
        if (sel !== hitId) onSelecionar(hitId);
        if (el.kind === 'linha') gesto.current = { t: 'mover-linha', id: hitId, sx: p.x, sy: p.y, orig: el, alterou: false };
        else gesto.current = { t: 'mover', id: hitId, dx: p.x - el.x, dy: p.y - el.y, alterou: false };
        return;
      }
    }
    gesto.current = { t: 'pan', sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y, moveu: false, tocouVia: hitId };
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    const c = camRef.current;

    if (g.t === 'pinca') {
      if (ponteiros.current.size < 2) return;
      const [a, b] = [...ponteiros.current.values()];
      const r = svgRef.current!.getBoundingClientRect();
      const k = limitarK((g.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0);
      const mx = (a.x + b.x) / 2 - r.left;
      const my = (a.y + b.y) / 2 - r.top;
      setCam({ k, x: g.cx0 - mx / k, y: g.cy0 - my / k });
      return;
    }
    if (g.t === 'pan') {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      if (!g.moveu && Math.hypot(dx, dy) < 6) return;
      g.moveu = true;
      setCam({ k: c.k, x: g.cx - dx / c.k, y: g.cy - dy / c.k });
      return;
    }

    const p = noPalco(e.clientX, e.clientY);
    if (g.t === 'mover') {
      g.alterou = true;
      atualizarEl(g.id, (el) => (el.kind === 'linha' ? el : { ...el, x: p.x - g.dx, y: p.y - g.dy }));
    } else if (g.t === 'mover-linha') {
      g.alterou = true;
      const dx = p.x - g.sx;
      const dy = p.y - g.sy;
      const o = g.orig;
      atualizarEl(g.id, () => ({
        ...o,
        x1: o.x1 + dx,
        y1: o.y1 + dy,
        x2: o.x2 + dx,
        y2: o.y2 + dy,
        cx: o.cx == null ? null : o.cx + dx,
        cy: o.cy == null ? null : o.cy + dy,
      }));
    } else if (g.t === 'girar') {
      g.alterou = true;
      atualizarEl(g.id, (el) => {
        if (el.kind === 'linha') return el;
        const graus = (Math.atan2(p.y - el.y, p.x - el.x) * 180) / Math.PI + 90;
        return { ...el, rot: ajustarAngulo(graus) };
      });
    } else if (g.t === 'escalar') {
      g.alterou = true;
      atualizarEl(g.id, (el) => {
        if (el.kind === 'linha') return el;
        const d = Math.hypot(p.x - el.x, p.y - el.y);
        const escala = Math.min(5, Math.max(0.25, (g.e0 * d) / g.d0));
        return { ...el, escala: Math.round(escala * 100) / 100 };
      });
    } else if (g.t === 'ponto') {
      g.alterou = true;
      atualizarEl(g.id, (el) => {
        if (el.kind !== 'linha') return el;
        if (g.qual === 'p1') return { ...el, x1: p.x, y1: p.y };
        if (g.qual === 'p2') return { ...el, x2: p.x, y2: p.y };
        return { ...el, cx: p.x, cy: p.y };
      });
    }
  };

  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    ponteiros.current.delete(e.pointerId);
    const g = gesto.current;
    if (g?.t === 'pinca') {
      if (ponteiros.current.size === 1) {
        const [pt] = [...ponteiros.current.values()];
        const c = camRef.current;
        gesto.current = { t: 'pan', sx: pt.x, sy: pt.y, cx: c.x, cy: c.y, moveu: true, tocouVia: null };
      } else gesto.current = null;
      return;
    }
    if (ponteiros.current.size > 0) return;
    if (g) {
      if (g.t === 'pan' && !g.moveu) onSelecionar(g.tocouVia);
      else if ('alterou' in g && g.alterou) confirmarGesto();
    }
    gesto.current = null;
  };

  const k = cam.k || 1;
  const vb = `${cam.x} ${cam.y} ${Math.max(1, tam.w) / k} ${Math.max(1, tam.h) / k}`;
  const ordenados = ordemDesenho(doc.elementos);
  const sel = doc.elementos.find((e) => e.id === selecionado) ?? null;
  const mpu = doc.metrosPorUnidade;
  const minHit = 30 / k;

  return (
    <div ref={wrapRef} className="editor-wrap">
      <svg
        ref={svgRef}
        className="editor-svg"
        viewBox={vb}
        width={tam.w}
        height={tam.h}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <CamadasCroqui doc={doc} fundoUrl={fundoUrl} />

        <g data-layer="interacao">
          {ordenados.map((el) => {
            if (el.kind === 'linha') {
              const d = el.cx == null ? `M${el.x1},${el.y1} L${el.x2},${el.y2}` : `M${el.x1},${el.y1} Q${el.cx},${el.cy} ${el.x2},${el.y2}`;
              return <path key={el.id} data-hit={el.id} d={d} stroke="transparent" strokeWidth={Math.max(minHit * 0.8, 1.2 / mpu)} fill="none" pointerEvents="stroke" />;
            }
            const { w, h } = tamanhoPalco(el, mpu);
            const hw = Math.max(w, minHit);
            const hh = Math.max(h, minHit);
            return (
              <rect
                key={el.id}
                data-hit={el.id}
                x={-hw / 2}
                y={-hh / 2}
                width={hw}
                height={hh}
                transform={`translate(${el.x} ${el.y}) rotate(${el.rot})`}
                fill="transparent"
              />
            );
          })}
          {sel && (sel.kind === 'linha' ? <AlcasLinha el={sel} k={k} /> : <AlcasPontual el={sel} k={k} mpu={mpu} />)}
        </g>
      </svg>
    </div>
  );
}

/** Fundo + desenho (sem interação). Usado pelo editor e pela exportação. */
export function CamadasCroqui({ doc, fundoUrl }: { doc: CroquiDoc; fundoUrl: string | null }) {
  const mpu = doc.metrosPorUnidade;
  return (
    <>
      <g data-layer="fundo">
        {doc.fundo.tipo === 'mapa' ? (
          fundoUrl ? <image href={fundoUrl} x={0} y={0} width={doc.largura} height={doc.altura} preserveAspectRatio="none" /> : <rect x={0} y={0} width={doc.largura} height={doc.altura} fill="#d9d9d9" />
        ) : doc.fundo.tipo === 'tracado' ? (
          <FundoTracadoSVG f={doc.fundo} largura={doc.largura} altura={doc.altura} mpu={mpu} />
        ) : (
          <FundoBranco largura={doc.largura} altura={doc.altura} mpu={mpu} grade={doc.fundo.grade} />
        )}
      </g>
      <g data-layer="elementos" pointerEvents="none">
        {ordemDesenho(doc.elementos).map((el) =>
          el.kind === 'linha' ? <LinhaSVG key={el.id} el={el} mpu={mpu} /> : <ElementoSVG key={el.id} el={el} mpu={mpu} />,
        )}
      </g>
    </>
  );
}

function FundoBranco({ largura, altura, mpu, grade }: { largura: number; altura: number; mpu: number; grade: boolean }) {
  const passo = 5 / mpu; // grade de 5 m
  return (
    <g>
      <rect x={0} y={0} width={largura} height={altura} fill="#f1f1ec" />
      {grade && (
        <>
          <defs>
            <pattern id="grade-croqui" width={passo} height={passo} patternUnits="userSpaceOnUse">
              <path d={`M${passo},0 L0,0 0,${passo}`} fill="none" stroke="#d6d6cf" strokeWidth={passo * 0.012} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={largura} height={altura} fill="url(#grade-croqui)" />
        </>
      )}
    </g>
  );
}

/** Caixa de seleção com tamanho mínimo na tela (as alças nunca ficam em cima de itens pequenos). */
function caixaSelecao(w: number, h: number, k: number) {
  const pad = 6 / k;
  const min = 44 / k;
  return { W: Math.max(w + pad * 2, min), H: Math.max(h + pad * 2, min) };
}

function AlcasPontual({ el, k, mpu }: { el: ElementoPontual; k: number; mpu: number }) {
  const { w, h } = tamanhoPalco(el, mpu);
  const { W, H } = caixaSelecao(w, h, k);
  const haste = 26 / k;
  return (
    <g transform={`translate(${el.x} ${el.y}) rotate(${el.rot})`}>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="none" stroke={COR_SEL} strokeWidth={1.6 / k} strokeDasharray={`${6 / k} ${4 / k}`} pointerEvents="none" />
      <line x1={0} y1={-H / 2} x2={0} y2={-H / 2 - haste} stroke={COR_SEL} strokeWidth={1.6 / k} pointerEvents="none" />
      <g data-handle="girar" style={{ cursor: 'grab' }}>
        <circle cx={0} cy={-H / 2 - haste} r={18 / k} fill="transparent" />
        <circle cx={0} cy={-H / 2 - haste} r={11 / k} fill="#ffffff" stroke={COR_SEL} strokeWidth={2.4 / k} />
        <path
          d={`M${-5 / k},${-H / 2 - haste - 1 / k} A${5 / k},${5 / k} 0 1 1 ${-1 / k},${-H / 2 - haste + 4.8 / k}`}
          fill="none"
          stroke={COR_SEL}
          strokeWidth={1.8 / k}
          strokeLinecap="round"
          transform={`rotate(${-el.rot} 0 ${-H / 2 - haste})`}
        />
      </g>
      <g data-handle="escalar" style={{ cursor: 'nwse-resize' }}>
        <circle cx={W / 2} cy={H / 2} r={16 / k} fill="transparent" />
        <rect x={W / 2 - 8 / k} y={H / 2 - 8 / k} width={16 / k} height={16 / k} rx={3 / k} fill={COR_SEL} stroke="#ffffff" strokeWidth={2 / k} />
      </g>
    </g>
  );
}

function AlcasLinha({ el, k }: { el: LinhaEl; k: number }) {
  const cx = el.cx ?? (el.x1 + el.x2) / 2;
  const cy = el.cy ?? (el.y1 + el.y2) / 2;
  const alca = (qual: 'p1' | 'p2' | 'c', x: number, y: number) => (
    <g key={qual} data-handle={qual} style={{ cursor: 'move' }}>
      <circle cx={x} cy={y} r={22 / k} fill="transparent" />
      <circle
        cx={x}
        cy={y}
        r={(qual === 'c' ? 8 : 10) / k}
        fill={qual === 'c' ? '#ffffff' : COR_SEL}
        stroke={qual === 'c' ? COR_SEL : '#ffffff'}
        strokeWidth={2.2 / k}
        strokeDasharray={qual === 'c' && el.cx == null ? `${3 / k} ${2 / k}` : undefined}
      />
    </g>
  );
  return (
    <g>
      {el.cx != null && (
        <path d={`M${el.x1},${el.y1} L${cx},${cy} L${el.x2},${el.y2}`} fill="none" stroke={COR_SEL} strokeWidth={1.2 / k} strokeDasharray={`${4 / k} ${3 / k}`} pointerEvents="none" />
      )}
      {alca('c', cx, cy)}
      {alca('p1', el.x1, el.y1)}
      {alca('p2', el.x2, el.y2)}
    </g>
  );
}
