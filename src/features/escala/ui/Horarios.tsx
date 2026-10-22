import { useMemo } from 'react';
import { formatMinutes, shiftMinutes } from '../../../lib/date';
import { CampoHora } from '../../../components/pickers';
import { Seg, gap } from '../../../components/ui';
import { turnosFrequentes } from '../calc';
import { ROTULO_SERVICO, type Entry, type ModeloTurno, type TipoServico } from '../model';

export interface OpcaoHorario {
  start: string;
  end: string;
  rotulo: string;
}

/** Atalhos de horário: modelos salvos + horários que o usuário mais usa. */
export function useOpcoesHorario(entries: Entry[], modelos: ModeloTurno[]): OpcaoHorario[] {
  return useMemo(() => {
    const vistos = new Set<string>();
    const out: OpcaoHorario[] = [];
    for (const f of turnosFrequentes(entries, 4)) {
      const k = `${f.start}|${f.end}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const modelo = modelos.find((m) => m.start === f.start && m.end === f.end);
      out.push({ start: f.start, end: f.end, rotulo: modelo ? modelo.nome : `usado ${f.vezes}×` });
    }
    for (const m of modelos) {
      const k = `${m.start}|${m.end}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ start: m.start, end: m.end, rotulo: m.nome });
    }
    return out.slice(0, 6);
  }, [entries, modelos]);
}

export function SlotGrid({
  opcoes,
  onPick,
  selecionado,
}: {
  opcoes: OpcaoHorario[];
  onPick: (o: OpcaoHorario) => void;
  selecionado?: { start: string; end: string } | null;
}) {
  return (
    <div className="slots">
      {opcoes.map((o) => (
        <button
          key={`${o.start}|${o.end}`}
          type="button"
          className="slot"
          aria-pressed={selecionado ? selecionado.start === o.start && selecionado.end === o.end : undefined}
          onClick={() => onPick(o)}
        >
          <b>
            {o.start} – {o.end}
          </b>
          <small>
            {o.rotulo} · {formatMinutes(shiftMinutes(o.start, o.end))}
          </small>
        </button>
      ))}
    </div>
  );
}

/** Dois campos de hora (início/fim) com a duração calculada. */
export function CamposHorario({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (v: { start: string; end: string }) => void;
}) {
  const valido = !!start && !!end;
  const dur = valido ? shiftMinutes(start, end) : 0;
  return (
    <div className="grid-2" style={{ alignItems: 'end' }}>
      <div className="field">
        <span className="field-label">Início</span>
        <CampoHora rotulo="Início do turno" titulo="Início do turno" value={start} onChange={(v) => onChange({ start: v, end })} />
      </div>
      <div className="field">
        <span className="field-label">
          Fim
          {valido && (
            <span className="badge red" style={{ marginLeft: 'auto' }}>
              {formatMinutes(dur)}
              {dur === 1440 ? ' (24h)' : ''}
            </span>
          )}
        </span>
        <CampoHora rotulo="Fim do turno" titulo="Fim do turno" value={end} onChange={(v) => onChange({ start, end: v })} />
      </div>
    </div>
  );
}

export type ServicoEscolha = 'ordinario' | TipoServico;

/** O que gravar no turno: ordinário não leva o campo (igual aos turnos lançados até a versão 5.1). */
export const servicoParaGravar = (v: ServicoEscolha): TipoServico | undefined => (v === 'ordinario' ? undefined : v);

const DICA_SERVICO: Record<ServicoEscolha, string> = {
  ordinario: 'Conta na carga horária do mês.',
  gse: 'Serviço extraordinário: soma à parte da carga do mês (limite de 40h no mês).',
  sobreaviso: 'Conta 1/3 das horas na carga do mês (NI ADM 033.2).',
};

/** Tipo de serviço do turno (NI ADM 033.2): ordinário, extraordinário (GSE) ou sobreaviso. */
export function ServicoSeg({ value, onChange }: { value: ServicoEscolha; onChange: (v: ServicoEscolha) => void }) {
  return (
    <div className="stack" style={gap(6)}>
      <span className="field-label">Tipo de serviço</span>
      <Seg<ServicoEscolha>
        value={value}
        onChange={onChange}
        ariaLabel="Tipo de serviço"
        options={(['ordinario', 'gse', 'sobreaviso'] as ServicoEscolha[]).map((v) => ({ value: v, label: ROTULO_SERVICO[v].longo }))}
      />
      <small className="subtle" style={{ fontSize: 13 }}>
        {DICA_SERVICO[value]}
      </small>
    </div>
  );
}
