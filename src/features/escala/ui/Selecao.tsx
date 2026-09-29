import { useState } from 'react';
import { CalendarX, Clock, Eraser, Palmtree, Stethoscope, X } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { Switch, gap } from '../../../components/ui';
import { NoDock } from '../../../components/dock';
import { formatMinutes, shiftMinutes } from '../../../lib/date';
import { ROTULO_MARCACAO, type TipoMarcacao } from '../model';
import { aplicarTurno, limparDias, marcar } from '../ops';
import { atualizar, useEscala } from '../store';
import { CamposHorario, SlotGrid, useOpcoesHorario } from './Horarios';
import { avisarDesfazer } from './DiaSheet';

/** Barra de ações para vários dias selecionados no calendário. */
export function SelecaoBar({ datas, onLimpar, onSair }: { datas: string[]; onLimpar: () => void; onSair: () => void }) {
  const [turnoOpen, setTurnoOpen] = useState(false);
  const n = datas.length;

  const marcarTodos = (kind: TipoMarcacao) => {
    atualizar((db) => marcar(db, datas, kind), `${ROTULO_MARCACAO[kind].longo} em ${n} dia(s)`);
    avisarDesfazer(`${ROTULO_MARCACAO[kind].longo}: ${n} dia(s)`);
    onLimpar();
  };

  return (
    <>
      <NoDock>
        <div className="sel-bar" role="toolbar" aria-label="Ações para os dias selecionados">
          <div className="row">
            <strong className="grow">
              {n === 0 ? 'Toque nos dias para selecionar' : `${n} dia(s) selecionado(s)`}
            </strong>
            {n > 0 && (
              <button type="button" className="btn sm ghost" onClick={onLimpar}>
                Limpar seleção
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Sair da seleção" onClick={onSair}>
              <X />
            </button>
          </div>
          <div className="acts">
            <button type="button" className="btn primary" disabled={!n} onClick={() => setTurnoOpen(true)}>
              <Clock /> Turno
            </button>
            <button type="button" className="btn" disabled={!n} onClick={() => marcarTodos('ferias')}>
              <Palmtree /> Férias
            </button>
            <button type="button" className="btn" disabled={!n} onClick={() => marcarTodos('afastamento')}>
              <Stethoscope /> Afast.
            </button>
            <button type="button" className="btn" disabled={!n} onClick={() => marcarTodos('edt')}>
              <CalendarX /> EDT
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={!n}
              onClick={() => {
                atualizar((db) => limparDias(db, datas), `${n} dia(s) limpos`);
                avisarDesfazer(`Lançamentos de ${n} dia(s) removidos`);
                onLimpar();
              }}
            >
              <Eraser /> Limpar
            </button>
          </div>
        </div>
      </NoDock>
      <LoteTurnoSheet
        open={turnoOpen}
        datas={datas}
        onClose={() => setTurnoOpen(false)}
        onFeito={() => {
          setTurnoOpen(false);
          onLimpar();
        }}
      />
    </>
  );
}

function LoteTurnoSheet({ open, datas, onClose, onFeito }: { open: boolean; datas: string[]; onClose: () => void; onFeito: () => void }) {
  const db = useEscala();
  const opcoes = useOpcoesHorario(db.entries, db.modelos);
  const [h, setH] = useState<{ start: string; end: string }>({ start: opcoes[0]?.start ?? '07:00', end: opcoes[0]?.end ?? '19:00' });
  const [substituir, setSubstituir] = useState(true);
  const ok = !!h.start && !!h.end;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Turno em ${datas.length} dia(s)`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!ok}
            onClick={() => {
              atualizar((d) => aplicarTurno(d, datas, h.start, h.end, substituir), `Turno em ${datas.length} dia(s)`);
              avisarDesfazer(`${datas.length} turno(s) de ${formatMinutes(shiftMinutes(h.start, h.end))} lançados`);
              onFeito();
            }}
          >
            Lançar
          </button>
        </>
      }
    >
      <div className="stack" style={gap(16)}>
        <SlotGrid opcoes={opcoes} selecionado={h} onPick={(o) => setH({ start: o.start, end: o.end })} />
        <CamposHorario start={h.start} end={h.end} onChange={setH} />
        <Switch
          checked={substituir}
          onChange={setSubstituir}
          label="Substituir turnos existentes"
          description={substituir ? 'Os dias ficam só com este turno.' : 'Adiciona este turno aos que já existem.'}
        />
      </div>
    </Sheet>
  );
}
