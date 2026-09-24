import { useState } from 'react';
import { ArrowLeftRight, BringToFront, ChevronDown, ChevronUp, Copy, Minus, Plus, RotateCcw, RotateCw, Spline, Trash2, X } from 'lucide-react';
import { Seg } from '../../components/ui';
import { comprimentoLinha, formatMetros } from './glyphs';
import { nomeElemento } from './elementos';
import { CORES_VEICULO, LINHAS, VEICULOS, VIAS, type Elemento, type EstadoVeiculo, type EstiloLinha, type TipoVeiculo, type TipoVia } from './model';

interface Props {
  el: Elemento;
  mpu: number;
  onChange: (patch: Partial<Elemento>, confirmar?: boolean) => void;
  onDuplicar: () => void;
  onFrente: () => void;
  onExcluir: () => void;
  onFechar: () => void;
}

const CORES_LINHA = ['#111111', '#e53935', '#1e6fe5', '#f2c200', '#2e9d4a', '#ffffff'];
const CORES_TEXTO = ['#111111', '#e53935', '#1e6fe5', '#ffffff'];

function Cores({ cores, valor, onPick }: { cores: string[]; valor: string; onPick: (c: string) => void }) {
  return (
    <div className="cro-cores" role="group" aria-label="Cor">
      {cores.map((c) => (
        <button
          key={c}
          type="button"
          className="cro-cor"
          aria-pressed={valor.toLowerCase() === c}
          aria-label={`Cor ${c}`}
          style={{ background: c }}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}

export function Painel({ el, mpu, onChange, onDuplicar, onFrente, onExcluir, onFechar }: Props) {
  // No celular começa recolhido (não cobre o desenho); no computador, aberto.
  const [aberto, setAberto] = useState(() => window.matchMedia?.('(min-width: 900px)').matches ?? true);
  const pontual = el.kind !== 'linha';
  const girar = (d: number) => el.kind !== 'linha' && onChange({ rot: (((el.rot + d) % 360) + 360) % 360 }, true);
  const redimensionar = (f: number) =>
    el.kind !== 'linha' && el.kind !== 'via' && onChange({ escala: Math.min(4, Math.max(0.25, Math.round(el.escala * f * 100) / 100)) }, true);

  return (
    <div className="cro-painel" role="region" aria-label="Propriedades do elemento">
      <div className="cro-painel-top">
        <button type="button" className="cro-painel-nome" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} title={aberto ? 'Menos opções' : 'Mais opções'}>
          {el.kind === 'veiculo' && <span className="dot" style={{ background: el.cor }} />}
          <strong>{nomeElemento(el)}</strong>
          {el.kind === 'veiculo' && <small>{VEICULOS.find((v) => v.tipo === el.tipo)?.nome}</small>}
          {el.kind === 'linha' && el.estilo === 'medida' && <small>{formatMetros(comprimentoLinha(el) * mpu)}</small>}
          {aberto ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <span className="grow" />
        <button type="button" className="icon-btn" title="Duplicar" aria-label="Duplicar" onClick={onDuplicar}>
          <Copy />
        </button>
        {el.kind !== 'via' && (
          <button type="button" className="icon-btn" title="Trazer para frente" aria-label="Trazer para frente" onClick={onFrente}>
            <BringToFront />
          </button>
        )}
        <button type="button" className="icon-btn" title="Excluir" aria-label="Excluir" onClick={onExcluir} style={{ color: 'var(--danger)' }}>
          <Trash2 />
        </button>
        <button type="button" className="icon-btn" title="Fechar" aria-label="Fechar painel" onClick={onFechar}>
          <X />
        </button>
      </div>

      {!aberto && (
        <div className="cro-painel-rapido">
          {pontual ? (
            <>
              <button type="button" className="btn sm" onClick={() => girar(-15)} aria-label="Girar 15° à esquerda">
                <RotateCcw /> 15°
              </button>
              <button type="button" className="btn sm" onClick={() => girar(15)} aria-label="Girar 15° à direita">
                <RotateCw /> 15°
              </button>
              {el.kind !== 'via' && (
                <>
                  <button type="button" className="btn sm icon" onClick={() => redimensionar(1 / 1.15)} aria-label="Diminuir">
                    <Minus />
                  </button>
                  <button type="button" className="btn sm icon" onClick={() => redimensionar(1.15)} aria-label="Aumentar">
                    <Plus />
                  </button>
                </>
              )}
            </>
          ) : (
            <button type="button" className="btn sm" onClick={() => onChange({ x1: el.x2, y1: el.y2, x2: el.x1, y2: el.y1 } as Partial<Elemento>, true)}>
              <ArrowLeftRight /> Inverter
            </button>
          )}
          <button type="button" className="btn sm ghost" onClick={() => setAberto(true)}>
            Mais <ChevronUp />
          </button>
        </div>
      )}

      {aberto && (
        <div className="cro-painel-body">
          {el.kind === 'veiculo' && (
            <>
              <Cores cores={CORES_VEICULO} valor={el.cor} onPick={(cor) => onChange({ cor }, true)} />
              <div className="grid-2">
                <input
                  className="input"
                  value={el.rotulo}
                  maxLength={6}
                  aria-label="Rótulo"
                  placeholder="V1"
                  onChange={(e) => onChange({ rotulo: e.target.value.toUpperCase() })}
                  onBlur={() => onChange({}, true)}
                />
                <select
                  className="select"
                  value={el.tipo}
                  aria-label="Tipo de veículo"
                  onChange={(e) => onChange({ tipo: e.target.value as TipoVeiculo }, true)}
                >
                  {VEICULOS.map((v) => (
                    <option key={v.tipo} value={v.tipo}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="input"
                value={el.descricao}
                aria-label="Descrição para a legenda"
                placeholder="Legenda: ex. VW Gol branco IXX1D23"
                onChange={(e) => onChange({ descricao: e.target.value })}
                onBlur={() => onChange({}, true)}
              />
              {el.tipo !== 'moto' && el.tipo !== 'bicicleta' && (
                <Seg<EstadoVeiculo>
                  value={el.estado}
                  onChange={(estado) => onChange({ estado }, true)}
                  ariaLabel="Estado do veículo"
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'capotado', label: 'Capotado' },
                    { value: 'tombado', label: 'Tombado' },
                  ]}
                />
              )}
            </>
          )}

          {el.kind === 'simbolo' && (
            <input
              className="input"
              value={el.rotulo}
              maxLength={20}
              aria-label="Rótulo do símbolo"
              placeholder="Rótulo (opcional), ex.: P1, Vítima"
              onChange={(e) => onChange({ rotulo: e.target.value })}
              onBlur={() => onChange({}, true)}
            />
          )}

          {el.kind === 'texto' && (
            <>
              <textarea
                className="textarea"
                style={{ minHeight: 70 }}
                value={el.texto}
                aria-label="Texto"
                onChange={(e) => onChange({ texto: e.target.value })}
                onBlur={() => onChange({}, true)}
              />
              <div className="row">
                <Cores cores={CORES_TEXTO} valor={el.cor} onPick={(cor) => onChange({ cor }, true)} />
                <label className="row" style={{ gap: 6, marginLeft: 'auto', fontSize: 14 }}>
                  <input type="checkbox" checked={el.fundo} onChange={(e) => onChange({ fundo: e.target.checked }, true)} /> Fundo branco
                </label>
              </div>
            </>
          )}

          {el.kind === 'via' && (
            <>
              <select className="select" value={el.tipo} aria-label="Tipo de via" onChange={(e) => onChange({ tipo: e.target.value as TipoVia }, true)}>
                {VIAS.map((v) => (
                  <option key={v.tipo} value={v.tipo}>
                    {v.nome}
                  </option>
                ))}
              </select>
              <div className="cro-slider">
                <span>Comprimento</span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={1}
                  value={el.comprimento}
                  onChange={(e) => onChange({ comprimento: Number(e.target.value) })}
                  onPointerUp={() => onChange({}, true)}
                />
                <b>{el.comprimento} m</b>
              </div>
              <Seg<'2' | '4'>
                value={String(el.faixas) as '2' | '4'}
                onChange={(f) => onChange({ faixas: Number(f) as 2 | 4 }, true)}
                ariaLabel="Faixas"
                options={[
                  { value: '2', label: '2 faixas' },
                  { value: '4', label: '4 faixas' },
                ]}
              />
            </>
          )}

          {el.kind === 'linha' && (
            <>
              <select className="select" value={el.estilo} aria-label="Tipo de linha" onChange={(e) => onChange({ estilo: e.target.value as EstiloLinha }, true)}>
                {LINHAS.map((l) => (
                  <option key={l.estilo} value={l.estilo}>
                    {l.nome} — {l.desc}
                  </option>
                ))}
              </select>
              <Cores cores={CORES_LINHA} valor={el.cor} onPick={(cor) => onChange({ cor }, true)} />
              <div className="row wrap" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    onChange({ x1: el.x2, y1: el.y2, x2: el.x1, y2: el.y1 } as Partial<Elemento>, true)
                  }
                >
                  <ArrowLeftRight /> Inverter
                </button>
                {el.cx != null ? (
                  <button type="button" className="btn sm" onClick={() => onChange({ cx: null, cy: null } as Partial<Elemento>, true)}>
                    <Spline /> Deixar reta
                  </button>
                ) : (
                  <span className="subtle" style={{ fontSize: 13 }}>
                    Arraste o ponto do meio para curvar.
                  </span>
                )}
              </div>
            </>
          )}

          {pontual && (
            <>
              <div className="cro-slider">
                <button type="button" className="btn sm icon" aria-label="Girar 15° à esquerda" onClick={() => onChange({ rot: (((el.rot - 15) % 360) + 360) % 360 }, true)}>
                  <RotateCcw />
                </button>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={Math.round(el.rot)}
                  aria-label="Rotação"
                  onChange={(e) => onChange({ rot: Number(e.target.value) })}
                  onPointerUp={() => onChange({}, true)}
                />
                <button type="button" className="btn sm icon" aria-label="Girar 15° à direita" onClick={() => onChange({ rot: (el.rot + 15) % 360 }, true)}>
                  <RotateCw />
                </button>
                <b>{Math.round(el.rot)}°</b>
              </div>
              {el.kind !== 'via' && (
                <div className="cro-slider">
                  <span>Tamanho</span>
                  <input
                    type="range"
                    min={25}
                    max={400}
                    step={5}
                    value={Math.round(el.escala * 100)}
                    aria-label="Tamanho"
                    onChange={(e) => onChange({ escala: Number(e.target.value) / 100 })}
                    onPointerUp={() => onChange({}, true)}
                  />
                  <button type="button" className="btn sm" onClick={() => onChange({ escala: 1 }, true)} title="Tamanho real">
                    {Math.round(el.escala * 100)}%
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
