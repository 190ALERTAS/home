import { useState, type ReactNode } from 'react';
import { Sheet } from '../../components/Sheet';
import { Seg } from '../../components/ui';
import { desenhoSimbolo, desenhoVeiculo, desenhoVia } from './glyphs';
import { SIMBOLOS, VEICULOS, VIAS, dimensoesVia, type TipoSimbolo, type TipoVeiculo, type TipoVia } from './model';

export type EscolhaPaleta =
  | { kind: 'veiculo'; tipo: TipoVeiculo }
  | { kind: 'simbolo'; tipo: TipoSimbolo }
  | { kind: 'via'; tipo: TipoVia }
  | { kind: 'texto' };

type Aba = 'veiculos' | 'objetos' | 'vias';

function Miniatura({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const m = Math.max(w, h) * 0.12;
  return (
    <svg viewBox={`${-w / 2 - m} ${-h / 2 - m} ${w + m * 2} ${h + m * 2}`} width="100%" height="46" aria-hidden>
      {children}
    </svg>
  );
}

export function Paleta({ open, onClose, onEscolher }: { open: boolean; onClose: () => void; onEscolher: (e: EscolhaPaleta) => void }) {
  const [aba, setAba] = useState<Aba>('veiculos');
  const escolher = (e: EscolhaPaleta) => {
    onEscolher(e);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar ao croqui" subtitle="O item aparece no centro da tela; arraste para posicionar.">
      <div className="stack" style={{ gap: 14 }}>
        <Seg<Aba>
          value={aba}
          onChange={setAba}
          ariaLabel="Categoria"
          options={[
            { value: 'veiculos', label: 'Veículos' },
            { value: 'objetos', label: 'Objetos' },
            { value: 'vias', label: 'Vias' },
          ]}
        />
        <div className="cro-paleta">
          {aba === 'veiculos' &&
            VEICULOS.map((v) => (
              <button key={v.tipo} type="button" className="cro-item" onClick={() => escolher({ kind: 'veiculo', tipo: v.tipo })}>
                <Miniatura w={v.w} h={Math.max(v.h, v.w * 0.42)}>
                  {desenhoVeiculo(v.tipo, 'normal', v.w, v.h, '#e53935')}
                </Miniatura>
                <span>{v.nome}</span>
              </button>
            ))}
          {aba === 'objetos' && (
            <>
              {SIMBOLOS.map((s) => (
                <button key={s.tipo} type="button" className="cro-item" onClick={() => escolher({ kind: 'simbolo', tipo: s.tipo })}>
                  <Miniatura w={s.w} h={s.h}>
                    {desenhoSimbolo({ tipo: s.tipo }, s.w, s.h)}
                  </Miniatura>
                  <span>{s.nome}</span>
                </button>
              ))}
              <button type="button" className="cro-item" onClick={() => escolher({ kind: 'texto' })}>
                <Miniatura w={4} h={2}>
                  <rect x={-2} y={-0.8} width={4} height={1.6} rx={0.2} fill="#ffffff" stroke="#111" strokeWidth={0.06} />
                  <text x={0} y={0.35} fontSize={1} fontWeight={700} fontFamily="Arial" textAnchor="middle" fill="#111">
                    Aa
                  </text>
                </Miniatura>
                <span>Texto</span>
              </button>
            </>
          )}
          {aba === 'vias' &&
            VIAS.map((v) => {
              const base = { tipo: v.tipo, comprimento: v.tipo === 'reta' ? 40 : 30, faixas: 2 as const };
              const { w, h } = dimensoesVia(base);
              return (
                <button key={v.tipo} type="button" className="cro-item" onClick={() => escolher({ kind: 'via', tipo: v.tipo })}>
                  <Miniatura w={w} h={Math.max(h, w * 0.4)}>
                    {desenhoVia(base)}
                  </Miniatura>
                  <span>{v.nome}</span>
                </button>
              );
            })}
        </div>
      </div>
    </Sheet>
  );
}
