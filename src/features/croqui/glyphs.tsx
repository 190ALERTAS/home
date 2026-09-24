import type { ReactNode } from 'react';
import {
  LARGURA_FAIXA,
  dimensoes,
  type ElementoPontual,
  type EstadoVeiculo,
  type LinhaEl,
  type SimboloEl,
  type TipoVeiculo,
  type VeiculoEl,
  type ViaEl,
  type TextoEl,
} from './model';

/**
 * Desenhos em SVG. Tudo em METROS, centrado na origem, frente do veículo para +x.
 * Só atributos de apresentação (sem classes CSS): o mesmo SVG é serializado
 * para gerar a imagem exportada.
 */

const TINTA = '#111111';
const HALO = '#ffffff';
const FONTE = 'Arial, Helvetica, sans-serif';
const T = 0.09; // espessura padrão de traço (m)

function contraste(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#111111' : '#ffffff';
}

/* ---------- Veículos (simbologia padrão de croqui) ---------- */

function CorpoRetangular({ w, h, cor, rx = 0.12 }: { w: number; h: number; cor: string; rx?: number }) {
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill="none" stroke={HALO} strokeWidth={T * 3.2} strokeOpacity={0.9} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={cor} stroke={TINTA} strokeWidth={T} />
    </>
  );
}

function Automovel({ w, h, cor, viatura, cacamba }: { w: number; h: number; cor: string; viatura?: boolean; cacamba?: boolean }) {
  const div = w / 2 - w * 0.45; // linha que separa a frente (triângulo)
  return (
    <g>
      <CorpoRetangular w={w} h={h} cor={cor} />
      {cacamba && (
        <rect x={-w / 2 + 0.2} y={-h / 2 + 0.2} width={div + w / 2 - 0.45} height={h - 0.4} fill="none" stroke={TINTA} strokeWidth={T * 0.8} />
      )}
      <line x1={div} y1={-h / 2} x2={div} y2={h / 2} stroke={TINTA} strokeWidth={T} />
      <path d={`M${div},${-h / 2} L${w / 2},0 L${div},${h / 2}`} fill="none" stroke={TINTA} strokeWidth={T} strokeLinejoin="round" />
      {viatura && (
        <g>
          <rect x={div - 0.75} y={-h * 0.42} width={0.34} height={h * 0.42} fill="#e53935" stroke={TINTA} strokeWidth={T * 0.6} />
          <rect x={div - 0.75} y={0} width={0.34} height={h * 0.42} fill="#1e5bff" stroke={TINTA} strokeWidth={T * 0.6} />
        </g>
      )}
    </g>
  );
}

function Onibus({ w, h, cor }: { w: number; h: number; cor: string }) {
  return (
    <g>
      <CorpoRetangular w={w} h={h} cor={cor} rx={h * 0.38} />
      <path d={`M${w / 2 - 1.3},${-h * 0.28} L${w / 2 - 0.45},0 L${w / 2 - 1.3},${h * 0.28}`} fill="none" stroke={TINTA} strokeWidth={T} strokeLinejoin="round" />
    </g>
  );
}

function Caminhao({ w, h, cor, carreta }: { w: number; h: number; cor: string; carreta?: boolean }) {
  const cabine = carreta ? 3.2 : Math.min(2.4, w * 0.27);
  const folga = carreta ? 0.35 : 0.15;
  const bau = w - cabine - folga;
  const hc = h * 0.82;
  const xc = w / 2 - cabine;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={bau} height={h} fill="none" stroke={HALO} strokeWidth={T * 3.2} strokeOpacity={0.9} />
      <rect x={xc} y={-hc / 2} width={cabine} height={hc} fill="none" stroke={HALO} strokeWidth={T * 3.2} strokeOpacity={0.9} />
      <rect x={-w / 2} y={-h / 2} width={bau} height={h} fill={cor} stroke={TINTA} strokeWidth={T} />
      {carreta && <line x1={-w / 2 + bau} y1={0} x2={xc} y2={0} stroke={TINTA} strokeWidth={T * 2} />}
      <rect x={xc} y={-hc / 2} width={cabine} height={hc} fill={cor} stroke={TINTA} strokeWidth={T} />
      <path d={`M${xc},${-hc / 2} L${w / 2},0 L${xc},${hc / 2}`} fill="none" stroke={TINTA} strokeWidth={T} strokeLinejoin="round" />
    </g>
  );
}

/** Símbolo padrão de motocicleta/bicicleta (vista lateral). */
function Bicicleta({ w, h, cor, moto }: { w: number; h: number; cor: string; moto?: boolean }) {
  const r = h * (moto ? 0.3 : 0.28);
  const yRoda = h / 2 - r;
  const xTras = -w / 2 + r;
  const xFrente = w / 2 - r;
  const topo = -h / 2 + 0.06;
  const traco = moto ? T * 1.5 : T * 1.1;
  const quadro = (
    <>
      <circle cx={xTras} cy={yRoda} r={r} />
      <circle cx={xFrente} cy={yRoda} r={r} />
      <path d={`M${xTras},${yRoda} L${xFrente - r * 0.1},${topo + h * 0.16} M${xTras},${yRoda} L${xFrente - r * 1.2},${yRoda}`} />
      <path d={`M${xFrente},${yRoda} L${xFrente - r * 0.1},${topo + h * 0.16}`} />
      <path d={`M${xFrente - r * 0.75},${topo + h * 0.14} L${xFrente + r * 0.55},${topo + h * 0.14}`} />
      <path d={`M${xTras},${yRoda - r * 0.2} L${xTras},${topo + h * 0.12} M${xTras - r * 0.6},${topo + h * 0.12} L${xTras + r * 0.6},${topo + h * 0.12}`} />
    </>
  );
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke={HALO} strokeWidth={traco * 3} strokeOpacity={0.9}>
        {quadro}
      </g>
      <g stroke={TINTA} strokeWidth={traco}>
        <circle cx={xTras} cy={yRoda} r={r} fill={cor} fillOpacity={0.85} />
        <circle cx={xFrente} cy={yRoda} r={r} fill={cor} fillOpacity={0.85} />
        {quadro}
      </g>
      {moto && <rect x={-r * 0.9} y={yRoda - r * 0.95} width={r * 1.6} height={r * 0.8} rx={0.05} fill={cor} stroke={TINTA} strokeWidth={T} />}
    </g>
  );
}

function Carroca({ w, h, cor }: { w: number; h: number; cor: string }) {
  const corpo = w * 0.58;
  const animalW = w * 0.32;
  const animalH = h * 0.48;
  const xAnimal = w / 2 - animalW;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={corpo} height={h} fill="none" stroke={HALO} strokeWidth={T * 3.2} strokeOpacity={0.9} />
      <rect x={-w / 2} y={-h / 2} width={corpo} height={h} fill={cor} stroke={TINTA} strokeWidth={T} />
      <path
        d={`M${-w / 2 + corpo},${-h * 0.33} H${xAnimal + animalW * 0.6} M${-w / 2 + corpo},${h * 0.33} H${xAnimal + animalW * 0.6}`}
        stroke={TINTA}
        strokeWidth={T}
      />
      <rect x={xAnimal} y={-animalH / 2} width={animalW} height={animalH} rx={animalH * 0.3} fill={cor} stroke={TINTA} strokeWidth={T} />
    </g>
  );
}

function Capotado({ w, h, cor }: { w: number; h: number; cor: string }) {
  const a = -w / 2 + w * 0.17;
  const b = w / 2 - w * 0.2;
  const roda = Math.min(1, w * 0.18);
  return (
    <g>
      <CorpoRetangular w={w} h={h} cor={cor} rx={0.05} />
      <path d={`M${a},${-h / 2} V${h / 2} M${b},${-h / 2} V${h / 2} M${a},${-h / 2} L${b},${h / 2} M${a},${h / 2} L${b},${-h / 2}`} stroke={TINTA} strokeWidth={T} />
      <g stroke={TINTA} strokeWidth={T * 2.6} strokeLinecap="round">
        {[-1, 1].map((lado) =>
          [a - roda * 0.1, b + roda * 0.1 - roda].map((x) => (
            <line key={`${lado}${x}`} x1={x} x2={x + roda} y1={lado * (h / 2 + 0.22)} y2={lado * (h / 2 + 0.22)} />
          )),
        )}
      </g>
    </g>
  );
}

/** Vista lateral (veículo tombado). */
function Tombado({ w, h, cor, tipo }: { w: number; h: number; cor: string; tipo: TipoVeiculo }) {
  const r = Math.min(h * 0.24, 0.55);
  const base = h / 2 - r * 0.9;
  if (tipo === 'onibus' || tipo === 'caminhao' || tipo === 'carreta') {
    const cab = tipo === 'onibus' ? 0 : tipo === 'carreta' ? 3.2 : Math.min(2.4, w * 0.27);
    const caixa = w - cab - (cab ? 0.2 : 0);
    return (
      <g>
        <rect x={-w / 2} y={-h / 2} width={caixa} height={base + h / 2} fill={cor} stroke={TINTA} strokeWidth={T} />
        {cab > 0 && (
          <path d={`M${w / 2 - cab},${base} V${-h / 2 + h * 0.25} H${w / 2 - cab * 0.35} L${w / 2},${-h / 2 + h * 0.5} V${base} Z`} fill={cor} stroke={TINTA} strokeWidth={T} />
        )}
        {tipo === 'onibus' && <line x1={-w / 2 + 0.4} x2={w / 2 - 0.4} y1={-h / 2 + h * 0.3} y2={-h / 2 + h * 0.3} stroke={TINTA} strokeWidth={T} />}
        {[-w / 2 + w * 0.15, w / 2 - w * 0.15 - (cab ? cab * 0.6 : 0), ...(cab ? [w / 2 - cab * 0.45] : [])].map((x) => (
          <circle key={x} cx={x} cy={base} r={r} fill="#ffffff" stroke={TINTA} strokeWidth={T} />
        ))}
      </g>
    );
  }
  return (
    <g>
      <path
        d={`M${-w / 2},${base} V${-h / 2 + h * 0.42} H${-w / 2 + w * 0.08} L${-w / 2 + w * 0.22},${-h / 2} H${w / 2 - w * 0.32} L${w / 2 - w * 0.18},${-h / 2 + h * 0.42} H${w / 2} V${base} Z`}
        fill={cor}
        stroke={TINTA}
        strokeWidth={T}
        strokeLinejoin="round"
      />
      <line x1={-w / 2} x2={w / 2} y1={-h / 2 + h * 0.42} y2={-h / 2 + h * 0.42} stroke={TINTA} strokeWidth={T * 0.8} />
      {[-w / 2 + w * 0.22, w / 2 - w * 0.22].map((x) => (
        <circle key={x} cx={x} cy={base} r={r} fill="#ffffff" stroke={TINTA} strokeWidth={T} />
      ))}
    </g>
  );
}

export function desenhoVeiculo(tipo: TipoVeiculo, estado: EstadoVeiculo, w: number, h: number, cor: string): ReactNode {
  if (tipo === 'moto' || tipo === 'bicicleta') return <Bicicleta w={w} h={h} cor={cor} moto={tipo === 'moto'} />;
  if (estado === 'tombado') return <Tombado w={w} h={h} cor={cor} tipo={tipo} />;
  if (tipo === 'carroca') return <Carroca w={w} h={h} cor={cor} />;
  if (estado === 'capotado') return <Capotado w={w} h={h} cor={cor} />;
  switch (tipo) {
    case 'onibus':
      return <Onibus w={w} h={h} cor={cor} />;
    case 'caminhao':
      return <Caminhao w={w} h={h} cor={cor} />;
    case 'carreta':
      return <Caminhao w={w} h={h} cor={cor} carreta />;
    case 'viatura':
      return <Automovel w={w} h={h} cor={cor} viatura />;
    case 'caminhonete':
      return <Automovel w={w} h={h} cor={cor} cacamba />;
    default:
      return <Automovel w={w} h={h} cor={cor} />;
  }
}

/* ---------- Símbolos ---------- */

function estrela(pontas: number, rExt: number, rInt: number): string {
  const pts: string[] = [];
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = (Math.PI * i) / pontas - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`);
  }
  return pts.join(' ');
}

export function desenhoSimbolo(el: Pick<SimboloEl, 'tipo'>, w: number, h: number): ReactNode {
  switch (el.tipo) {
    case 'impacto':
      return (
        <g>
          <polygon points={estrela(8, w / 2, w * 0.22)} fill="#ffd400" stroke="#d50000" strokeWidth={T * 1.3} strokeLinejoin="round" />
          <polygon points={estrela(8, w * 0.26, w * 0.12)} fill="#ff3d00" />
        </g>
      );
    case 'pedestre': {
      const s = h;
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[HALO, TINTA].map((c, i) => (
            <g key={c} stroke={c} strokeWidth={i === 0 ? T * 3.6 : T * 1.4} strokeOpacity={i === 0 ? 0.9 : 1}>
              <circle cx={0} cy={-s * 0.36} r={s * 0.12} fill={i === 1 ? '#ffffff' : 'none'} />
              <path d={`M0,${-s * 0.24} V${s * 0.12} M${-s * 0.24},${-s * 0.1} L0,${-s * 0.16} L${s * 0.24},${-s * 0.1} M0,${s * 0.12} L${-s * 0.18},${s * 0.46} M0,${s * 0.12} L${s * 0.18},${s * 0.46}`} />
            </g>
          ))}
        </g>
      );
    }
    case 'animal':
      return (
        <g stroke={TINTA} strokeWidth={T} strokeLinejoin="round">
          <path
            d={`M${-w * 0.4},${-h * 0.05} Q${-w * 0.42},${-h * 0.3} ${-w * 0.15},${-h * 0.28} H${w * 0.2} L${w * 0.34},${-h * 0.46} L${w * 0.5},${-h * 0.38} L${w * 0.38},${-h * 0.12} Q${w * 0.3},${h * 0.05} ${w * 0.22},${h * 0.05} V${h * 0.46} H${w * 0.12} V${h * 0.1} H${-w * 0.22} V${h * 0.46} H${-w * 0.32} V${h * 0.06} Q${-w * 0.42},${h * 0.02} ${-w * 0.4},${-h * 0.05} Z`}
            fill="#8d6e63"
          />
          <path d={`M${-w * 0.41},${-h * 0.12} L${-w * 0.5},${h * 0.2}`} fill="none" />
        </g>
      );
    case 'semaforo':
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.2} fill="#222222" stroke={HALO} strokeWidth={T * 0.8} />
          {['#ff1744', '#ffc400', '#00e676'].map((c, i) => (
            <circle key={c} cx={0} cy={-h / 2 + (h / 3) * (i + 0.5)} r={w * 0.28} fill={c} />
          ))}
        </g>
      );
    case 'pare': {
      const r = w / 2;
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i + Math.PI / 8;
        return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`;
      }).join(' ');
      return (
        <g>
          <polygon points={pts} fill="#d50000" stroke="#ffffff" strokeWidth={T * 1.2} />
          <text x={0} y={w * 0.11} fontSize={w * 0.3} fontFamily={FONTE} fontWeight={800} fill="#ffffff" textAnchor="middle">
            PARE
          </text>
        </g>
      );
    }
    case 'preferencia':
      return (
        <polygon
          points={`${-w / 2},${-h / 2} ${w / 2},${-h / 2} 0,${h / 2}`}
          fill="#ffffff"
          stroke="#d50000"
          strokeWidth={w * 0.13}
          strokeLinejoin="round"
        />
      );
    case 'poste':
      return (
        <g>
          <circle r={w / 2} fill="#9e9e9e" stroke={TINTA} strokeWidth={T} />
          <path d={`M${-w * 0.3},${-w * 0.3} L${w * 0.3},${w * 0.3} M${-w * 0.3},${w * 0.3} L${w * 0.3},${-w * 0.3}`} stroke={TINTA} strokeWidth={T} />
        </g>
      );
    case 'arvore':
      return (
        <g>
          <polygon points={estrela(9, w / 2, w * 0.4)} fill="#2e7d32" fillOpacity={0.9} stroke="#1b5e20" strokeWidth={T} strokeLinejoin="round" />
          <circle r={w * 0.12} fill="#5d4037" />
        </g>
      );
    case 'cone':
      return (
        <g>
          <circle r={w / 2} fill="#ff6d00" stroke={TINTA} strokeWidth={T * 0.8} />
          <circle r={w * 0.3} fill="none" stroke="#ffffff" strokeWidth={w * 0.1} />
          <circle r={w * 0.1} fill="#ff6d00" />
        </g>
      );
    case 'faixa': {
      const listras = Math.max(3, Math.round(h / 0.8));
      const passo = h / listras;
      return (
        <g>
          {Array.from({ length: listras }, (_, i) => (
            <rect key={i} x={-w / 2} y={-h / 2 + passo * i + passo * 0.2} width={w} height={passo * 0.6} fill="#ffffff" stroke="#9e9e9e" strokeWidth={0.04} />
          ))}
        </g>
      );
    }
    case 'lombada': {
      const n = Math.max(4, Math.round(h / 0.6));
      const passo = h / n;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#ffd600" stroke={TINTA} strokeWidth={T * 0.7} />
          {Array.from({ length: n }, (_, i) =>
            i % 2 === 0 ? <rect key={i} x={-w / 2} y={-h / 2 + passo * i} width={w} height={passo} fill="#212121" /> : null,
          )}
        </g>
      );
    }
    case 'muro': {
      const n = Math.max(3, Math.round(w / 0.5));
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#bdbdbd" stroke={TINTA} strokeWidth={T} />
          <path
            d={Array.from({ length: n }, (_, i) => {
              const x = -w / 2 + (w / n) * i;
              return `M${x},${h / 2} L${x + w / n},${-h / 2}`;
            }).join(' ')}
            stroke={TINTA}
            strokeWidth={T * 0.6}
          />
        </g>
      );
    }
    case 'fragmentos': {
      const pts: [number, number, number][] = [
        [-0.38, -0.2, 0.09], [-0.15, 0.25, 0.07], [0.1, -0.3, 0.08], [0.32, 0.1, 0.1], [-0.05, 0.02, 0.06],
        [0.22, 0.34, 0.05], [-0.3, 0.32, 0.05], [0.4, -0.25, 0.06], [-0.22, -0.02, 0.05], [0.05, 0.4, 0.05],
      ];
      return (
        <g>
          <ellipse rx={w / 2} ry={h / 2} fill="#424242" fillOpacity={0.18} stroke="#424242" strokeWidth={T * 0.6} strokeDasharray={`${T * 2} ${T * 2}`} />
          {pts.map(([x, y, r], i) => (
            <rect key={i} x={x * w - r * w * 0.5} y={y * h - r * w * 0.35} width={r * w} height={r * w * 0.7} fill="#212121" transform={`rotate(${i * 37} ${x * w} ${y * h})`} />
          ))}
        </g>
      );
    }
  }
}

/* ---------- Vias ---------- */

const ASFALTO = '#3a3c41';
const BORDA = '#f5f5f5';
const EIXO = '#ffc400';

export function desenhoVia(el: Pick<ViaEl, 'tipo' | 'comprimento' | 'faixas'>): ReactNode {
  const L = el.comprimento;
  const lg = el.faixas * LARGURA_FAIXA;
  const tr = 0.15; // largura da pintura (m)
  const tracejado = '3 2.5';
  const dupla = el.faixas === 4;
  /** Eixo central: tracejado amarelo (2 faixas) ou linha dupla contínua (4 faixas). */
  const eixo = (d: string, vertical = false, key?: string) =>
    dupla ? (
      <g key={key}>
        <path d={d} stroke={EIXO} strokeWidth={tr} fill="none" transform={vertical ? 'translate(-0.18 0)' : 'translate(0 -0.18)'} />
        <path d={d} stroke={EIXO} strokeWidth={tr} fill="none" transform={vertical ? 'translate(0.18 0)' : 'translate(0 0.18)'} />
      </g>
    ) : (
      <path key={key} d={d} stroke={EIXO} strokeWidth={tr} strokeDasharray={tracejado} fill="none" />
    );
  const borda = (d: string) => <path d={d} stroke={BORDA} strokeWidth={tr} fill="none" />;
  const h = lg / 2;

  switch (el.tipo) {
    case 'reta':
      return (
        <g>
          <rect x={-L / 2} y={-h} width={L} height={lg} fill={ASFALTO} />
          {borda(`M${-L / 2},${-h + 0.3} H${L / 2} M${-L / 2},${h - 0.3} H${L / 2}`)}
          {dupla && (
            <path d={`M${-L / 2},${-LARGURA_FAIXA} H${L / 2} M${-L / 2},${LARGURA_FAIXA} H${L / 2}`} stroke={BORDA} strokeWidth={tr} strokeDasharray={tracejado} />
          )}
          {eixo(`M${-L / 2},0 H${L / 2}`)}
        </g>
      );
    case 'cruzamento':
      return (
        <g>
          <rect x={-L / 2} y={-h} width={L} height={lg} fill={ASFALTO} />
          <rect x={-h} y={-L / 2} width={lg} height={L} fill={ASFALTO} />
          {borda(
            [
              `M${-L / 2},${-h + 0.3} H${-h}`,
              `M${h},${-h + 0.3} H${L / 2}`,
              `M${-L / 2},${h - 0.3} H${-h}`,
              `M${h},${h - 0.3} H${L / 2}`,
              `M${-h + 0.3},${-L / 2} V${-h}`,
              `M${h - 0.3},${-L / 2} V${-h}`,
              `M${-h + 0.3},${h} V${L / 2}`,
              `M${h - 0.3},${h} V${L / 2}`,
            ].join(' '),
          )}
          {eixo(`M${-L / 2},0 H${-h - 0.6}`, false, 'a')}
          {eixo(`M${h + 0.6},0 H${L / 2}`, false, 'b')}
          {eixo(`M0,${-L / 2} V${-h - 0.6}`, true, 'c')}
          {eixo(`M0,${h + 0.6} V${L / 2}`, true, 'd')}
        </g>
      );
    case 'entroncamento': {
      // Caixa L × (L/2 + lg/2): via principal no topo, via secundária descendo.
      const alt = L / 2 + h;
      const topo = -alt / 2;
      const yH = topo + h; // eixo da via principal
      const baseH = topo + lg;
      return (
        <g>
          <rect x={-L / 2} y={topo} width={L} height={lg} fill={ASFALTO} />
          <rect x={-h} y={baseH - 0.01} width={lg} height={alt / 2 - baseH + 0.01} fill={ASFALTO} />
          {borda(
            [
              `M${-L / 2},${topo + 0.3} H${L / 2}`,
              `M${-L / 2},${baseH - 0.3} H${-h}`,
              `M${h},${baseH - 0.3} H${L / 2}`,
              `M${-h + 0.3},${baseH} V${alt / 2}`,
              `M${h - 0.3},${baseH} V${alt / 2}`,
            ].join(' '),
          )}
          {eixo(`M${-L / 2},${yH} H${-h - 0.6}`, false, 'a')}
          {eixo(`M${h + 0.6},${yH} H${L / 2}`, false, 'b')}
          {eixo(`M0,${baseH + 0.6} V${alt / 2}`, true, 'c')}
        </g>
      );
    }
    case 'rotula': {
      const R = L / 2;
      const ri = Math.max(1.5, R - lg);
      return (
        <g>
          <circle r={R} fill={ASFALTO} />
          <circle r={ri} fill="#7cb342" stroke={BORDA} strokeWidth={tr} />
          <circle r={R - 0.3} fill="none" stroke={BORDA} strokeWidth={tr} />
          <circle r={(R + ri) / 2} fill="none" stroke={BORDA} strokeWidth={tr} strokeDasharray={tracejado} />
        </g>
      );
    }
    case 'curva': {
      const S = L / 2 + h;
      const c = -S / 2; // centro do arco no canto superior esquerdo da caixa
      const rExt = S;
      const rInt = S - lg;
      const arco = (r: number) => `M${c + r},${c} A${r},${r} 0 0 1 ${c},${c + r}`;
      return (
        <g>
          <path d={`${arco(rExt)} L${c},${c + rInt} A${rInt},${rInt} 0 0 0 ${c + rInt},${c} Z`} fill={ASFALTO} />
          {borda(arco(rExt - 0.3))}
          {borda(arco(rInt + 0.3))}
          <path d={arco(S - h)} stroke={EIXO} strokeWidth={tr} strokeDasharray={dupla ? undefined : tracejado} fill="none" />
        </g>
      );
    }
  }
}

/* ---------- Elemento completo ---------- */

/** Rótulo sempre na vertical (não gira com o veículo). */
function Rotulo({ texto, tamanho, rot, cor, dy = 0 }: { texto: string; tamanho: number; rot: number; cor: string; dy?: number }) {
  if (!texto) return null;
  const claro = contraste(cor) === '#111111';
  return (
    <text
      x={0}
      y={0}
      transform={`rotate(${-rot}) translate(0 ${dy})`}
      fontSize={tamanho}
      fontFamily={FONTE}
      fontWeight={800}
      textAnchor="middle"
      dominantBaseline="central"
      fill={claro ? '#111111' : '#ffffff'}
      stroke={claro ? '#ffffff' : '#111111'}
      strokeWidth={tamanho * 0.14}
      paintOrder="stroke"
    >
      {texto}
    </text>
  );
}

export function transformPontual(el: ElementoPontual, mpu: number): string {
  const k = el.escala / mpu;
  return `translate(${el.x} ${el.y}) rotate(${el.rot}) scale(${k})`;
}

export function ElementoSVG({ el, mpu }: { el: ElementoPontual; mpu: number }) {
  const { w, h } = dimensoes(el);
  let corpo: ReactNode;
  let rotulo: ReactNode = null;
  if (el.kind === 'veiculo') {
    corpo = desenhoVeiculo(el.tipo, el.estado, w, h, el.cor);
    const base = el.tipo === 'moto' || el.tipo === 'bicicleta' ? 0.75 : Math.min(1.35, dimensoesVeiculoLargura(el) * 0.68);
    rotulo = <Rotulo texto={el.rotulo} tamanho={base} rot={el.rot} cor={el.tipo === 'moto' || el.tipo === 'bicicleta' ? '#ffffff' : el.cor} dy={el.tipo === 'moto' || el.tipo === 'bicicleta' ? -h * 0.9 : 0} />;
  } else if (el.kind === 'simbolo') {
    corpo = desenhoSimbolo(el, w, h);
    if (el.rotulo) rotulo = <Rotulo texto={el.rotulo} tamanho={0.9} rot={el.rot} cor="#ffffff" dy={-Math.max(w, h) * 0.75} />;
  } else if (el.kind === 'via') {
    corpo = desenhoVia(el);
  } else {
    corpo = <TextoSVG el={el} />;
  }
  return (
    <g transform={transformPontual(el, mpu)} data-id={el.id}>
      {corpo}
      {rotulo}
    </g>
  );
}

function dimensoesVeiculoLargura(el: VeiculoEl): number {
  return dimensoes(el).h;
}

function TextoSVG({ el }: { el: TextoEl }) {
  const linhas = el.texto.split('\n');
  const { w, h } = dimensoes(el);
  const fs = 1;
  return (
    <g>
      {el.fundo && <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.2} fill="#ffffff" fillOpacity={0.92} stroke={TINTA} strokeWidth={0.05} />}
      <text
        fontSize={fs}
        fontFamily={FONTE}
        fontWeight={700}
        textAnchor="middle"
        fill={el.cor}
        stroke={el.fundo ? 'none' : el.cor === '#ffffff' ? '#111111' : '#ffffff'}
        strokeWidth={el.fundo ? 0 : 0.18}
        paintOrder="stroke"
      >
        {linhas.map((l, i) => (
          <tspan key={i} x={0} y={-h / 2 + 0.2 + fs * 0.95 + i * 1.25}>
            {l || ' '}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/* ---------- Linhas (setas, frenagem, medida) ---------- */

export function comprimentoLinha(el: LinhaEl): number {
  if (el.cx == null || el.cy == null) return Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
  let total = 0;
  let px = el.x1;
  let py = el.y1;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const x = (1 - t) * (1 - t) * el.x1 + 2 * (1 - t) * t * el.cx + t * t * el.x2;
    const y = (1 - t) * (1 - t) * el.y1 + 2 * (1 - t) * t * el.cy + t * t * el.y2;
    total += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return total;
}

function caminho(el: LinhaEl, desloc = 0): string {
  const dx = el.x2 - el.x1;
  const dy = el.y2 - el.y1;
  const n = Math.hypot(dx, dy) || 1;
  const ox = (-dy / n) * desloc;
  const oy = (dx / n) * desloc;
  if (el.cx == null || el.cy == null) return `M${el.x1 + ox},${el.y1 + oy} L${el.x2 + ox},${el.y2 + oy}`;
  return `M${el.x1 + ox},${el.y1 + oy} Q${el.cx + ox},${el.cy + oy} ${el.x2 + ox},${el.y2 + oy}`;
}

export function formatMetros(m: number): string {
  return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}

export function LinhaSVG({ el, mpu }: { el: LinhaEl; mpu: number }) {
  const u = 1 / mpu; // unidades por metro
  const larg = 0.26 * u;
  const halo = larg + 0.24 * u;
  const d = caminho(el);
  // direção final para a ponta da seta
  const fx = el.cx != null ? el.cx : el.x1;
  const fy = el.cy != null ? el.cy : el.y1;
  const ang = Math.atan2(el.y2 - fy, el.x2 - fx);
  const ponta = 1.3 * u;
  const seta = `M${el.x2},${el.y2} L${el.x2 - Math.cos(ang - 0.42) * ponta},${el.y2 - Math.sin(ang - 0.42) * ponta} L${el.x2 - Math.cos(ang + 0.42) * ponta},${el.y2 - Math.sin(ang + 0.42) * ponta} Z`;

  if (el.estilo === 'frenagem') {
    const off = 0.8 * u;
    return (
      <g data-id={el.id} fill="none" strokeLinecap="round">
        {[-off, off].map((o) => (
          <g key={o}>
            <path d={caminho(el, o)} stroke={HALO} strokeOpacity={0.8} strokeWidth={0.45 * u} />
            <path d={caminho(el, o)} stroke={el.cor} strokeWidth={0.3 * u} strokeDasharray={`${0.9 * u} ${0.35 * u}`} />
          </g>
        ))}
      </g>
    );
  }

  if (el.estilo === 'medida') {
    const comp = comprimentoLinha(el) * mpu;
    const dx = el.x2 - el.x1;
    const dy = el.y2 - el.y1;
    const n = Math.hypot(dx, dy) || 1;
    const px = (-dy / n) * 0.7 * u;
    const py = (dx / n) * 0.7 * u;
    const mx = el.cx != null ? 0.25 * el.x1 + 0.5 * el.cx + 0.25 * el.x2 : (el.x1 + el.x2) / 2;
    const my = el.cy != null ? 0.25 * el.y1 + 0.5 * el.cy + 0.25 * el.y2 : (el.y1 + el.y2) / 2;
    const txt = formatMetros(comp);
    const fs = 1.1 * u;
    const tw = txt.length * fs * 0.56;
    return (
      <g data-id={el.id}>
        <path d={d} stroke={HALO} strokeWidth={0.34 * u} fill="none" strokeOpacity={0.85} />
        <path d={d} stroke={el.cor} strokeWidth={0.13 * u} fill="none" />
        <path d={`M${el.x1 - px},${el.y1 - py} L${el.x1 + px},${el.y1 + py} M${el.x2 - px},${el.y2 - py} L${el.x2 + px},${el.y2 + py}`} stroke={el.cor} strokeWidth={0.13 * u} />
        <rect x={mx - tw / 2 - 0.3 * u} y={my - fs * 0.75} width={tw + 0.6 * u} height={fs * 1.5} rx={0.3 * u} fill="#ffffff" stroke={el.cor} strokeWidth={0.08 * u} />
        <text x={mx} y={my} fontSize={fs} fontFamily={FONTE} fontWeight={700} fill="#111111" textAnchor="middle" dominantBaseline="central">
          {txt}
        </text>
      </g>
    );
  }

  const tracejado = el.estilo === 'pos-impacto' ? `${1.1 * u} ${0.7 * u}` : undefined;
  return (
    <g data-id={el.id} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={HALO} strokeOpacity={0.85} strokeWidth={halo} fill="none" />
      <path d={seta} fill={HALO} stroke={HALO} strokeWidth={0.24 * u} />
      <path d={d} stroke={el.cor} strokeWidth={larg} strokeDasharray={tracejado} fill="none" />
      <path d={seta} fill={el.cor} />
    </g>
  );
}
