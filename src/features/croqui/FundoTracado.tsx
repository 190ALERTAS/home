import { useId } from 'react';
import type { ClasseVia, FundoTracado } from './model';

/** Cores do traçado plano (as mesmas dos modelos de via do croqui). */
export const CORES_TRACADO = {
  papel: '#f1f1ec',
  meioFio: '#bdbdb3',
  calcada: '#dbdbd2',
  borda: '#f5f5f5',
  eixo: '#ffc400',
  pintura: '#f5f5f5',
  texto: '#ffffff',
} as const;

export function corPista(classe: ClasseVia): string {
  switch (classe) {
    case 'terra':
      return '#b49f79';
    case 'pedestre':
      return '#cdc8bd';
    case 'servico':
      return '#4b4d53';
    default:
      return '#3a3c41';
  }
}

const ORDEM: ClasseVia[] = ['terra', 'pedestre', 'servico', 'local', 'principal', 'rodovia'];

function caminho(pts: number[]): string {
  let d = '';
  for (let i = 0; i + 1 < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i]},${pts[i + 1]}`;
  return d;
}

/**
 * Ruas reais do local (OpenStreetMap) desenhadas em estilo plano: calçada, pista,
 * pintura, mão única e nomes. Tudo em vetor, recortado ao palco.
 */
export function FundoTracadoSVG({ f, largura, altura, mpu }: { f: FundoTracado; largura: number; altura: number; mpu: number }) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = 1 / mpu;
  const clip = `trc-clip-${base}`;
  const vias = [...f.vias].sort((a, b) => ORDEM.indexOf(a.classe) - ORDEM.indexOf(b.classe));
  const comCalcada = vias.filter((v) => v.calcada > 0);
  const comBorda = vias.filter((v) => v.classe === 'principal' || v.classe === 'rodovia');
  const pavimentada = (c: ClasseVia) => c !== 'terra' && c !== 'pedestre';

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={largura} height={altura} />
        </clipPath>
        {f.rotulos.map((r, i) => (
          <path key={i} id={`${base}-r${i}`} d={caminho(r.pts)} />
        ))}
      </defs>
      <rect x={0} y={0} width={largura} height={altura} fill={CORES_TRACADO.papel} />
      <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Meio-fio e calçada */}
        {comCalcada.map((v, i) => (
          <path key={`mf${i}`} d={caminho(v.pts)} stroke={CORES_TRACADO.meioFio} strokeWidth={(v.largura + v.calcada * 2 + 0.35) * u} />
        ))}
        {comCalcada.map((v, i) => (
          <path key={`ca${i}`} d={caminho(v.pts)} stroke={CORES_TRACADO.calcada} strokeWidth={(v.largura + v.calcada * 2) * u} />
        ))}
        {/* Linha de bordo das vias principais (fica visível só nas laterais da pista) */}
        {comBorda.map((v, i) => (
          <path key={`bo${i}`} d={caminho(v.pts)} stroke={CORES_TRACADO.borda} strokeWidth={v.largura * u} strokeLinecap="butt" />
        ))}
        {/* Pista */}
        {vias.map((v, i) => (
          <path
            key={`pi${i}`}
            d={caminho(v.pts)}
            stroke={corPista(v.classe)}
            strokeWidth={(v.largura - (v.classe === 'principal' || v.classe === 'rodovia' ? 0.5 : 0)) * u}
          />
        ))}
        {/* Pintura: eixo amarelo nas vias de mão dupla, divisão branca nas de mão única */}
        {vias.map((v, i) => {
          if (!pavimentada(v.classe) || v.classe === 'servico') return null;
          const d = caminho(v.pts);
          if (v.mao === 'dupla') {
            if (v.largura < 5.5) return null;
            const dupla = v.faixas >= 4 || v.largura >= 11;
            return dupla ? (
              <g key={`ei${i}`}>
                <path d={d} stroke={CORES_TRACADO.eixo} strokeWidth={0.7 * u} strokeLinecap="butt" />
                <path d={d} stroke={corPista(v.classe)} strokeWidth={0.3 * u} strokeLinecap="butt" />
              </g>
            ) : (
              <path key={`ei${i}`} d={d} stroke={CORES_TRACADO.eixo} strokeWidth={0.2 * u} strokeDasharray={`${3 * u} ${4 * u}`} strokeLinecap="butt" />
            );
          }
          if (v.faixas < 2) return null;
          return (
            <path key={`ei${i}`} d={d} stroke={CORES_TRACADO.pintura} strokeWidth={0.2 * u} strokeDasharray={`${2.5 * u} ${4 * u}`} strokeLinecap="butt" />
          );
        })}
        {/* Interseções: sem pintura dentro do cruzamento */}
        {f.cruzamentos.map((c, i) => (
          <circle key={`cr${i}`} cx={c.x} cy={c.y} r={c.r * u} fill={corPista(c.classe)} stroke="none" />
        ))}
        {/* Setas de mão única */}
        {f.setas.map((s, i) => (
          <path
            key={`se${i}`}
            d="M-1.6,-0.22 H0.35 V-0.75 L1.6,0 L0.35,0.75 V0.22 H-1.6 Z"
            fill={CORES_TRACADO.pintura}
            stroke="none"
            transform={`translate(${s.x} ${s.y}) rotate(${s.ang}) scale(${u})`}
          />
        ))}
        {/* Nomes das ruas */}
        {f.rotulos.map((r, i) => (
          <text
            key={`no${i}`}
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight={700}
            fontSize={r.tam * u}
            fill={CORES_TRACADO.texto}
            stroke={corPista('local')}
            strokeWidth={r.tam * u * 0.32}
            strokeLinejoin="round"
            paintOrder="stroke"
            dominantBaseline="central"
            letterSpacing={r.tam * u * 0.03}
          >
            <textPath href={`#${base}-r${i}`} startOffset="50%" textAnchor="middle">
              {r.texto}
            </textPath>
          </text>
        ))}
      </g>
    </g>
  );
}
