import { useState } from 'react';
import { CalendarOff, Clock, Eraser, X } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { Switch, gap } from '../../../components/ui';
import { NoDock } from '../../../components/dock';
import { confirmDialog } from '../../../components/dialogs';
import { formatMinutes, shiftMinutes } from '../../../lib/date';
import { ROTULO_INDISP, ROTULO_SERVICO, type TipoIndisponibilidade } from '../model';
import { aplicarTurno, impactoLancamento, limparDias, marcarIndisponibilidade } from '../ops';
import { atualizar, useEscala } from '../store';
import { CamposHorario, ServicoSeg, SlotGrid, servicoParaGravar, useOpcoesHorario, type ServicoEscolha } from './Horarios';
import { EscolhaIndisp } from './Indisponibilidade';
import { avisarDesfazer } from './DiaSheet';

/** Barra de ações para vários dias selecionados no calendário. */
export function SelecaoBar({ datas, onLimpar, onSair }: { datas: string[]; onLimpar: () => void; onSair: () => void }) {
  const [folha, setFolha] = useState<null | 'escala' | 'indisp'>(null);
  const n = datas.length;
  const feito = () => {
    setFolha(null);
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
            <button type="button" className="btn primary" disabled={!n} onClick={() => setFolha('escala')}>
              <Clock /> Escala
            </button>
            <button type="button" className="btn" disabled={!n} onClick={() => setFolha('indisp')}>
              <CalendarOff /> Indisponibilidade
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
      <LoteTurnoSheet open={folha === 'escala'} datas={datas} onClose={() => setFolha(null)} onFeito={feito} />
      <LoteIndispSheet open={folha === 'indisp'} datas={datas} onClose={() => setFolha(null)} onFeito={feito} />
    </>
  );
}

function LoteTurnoSheet({ open, datas, onClose, onFeito }: { open: boolean; datas: string[]; onClose: () => void; onFeito: () => void }) {
  const db = useEscala();
  const opcoes = useOpcoesHorario(db.entries, db.modelos);
  const [h, setH] = useState<{ start: string; end: string }>({ start: opcoes[0]?.start ?? '07:00', end: opcoes[0]?.end ?? '19:00' });
  const [servico, setServico] = useState<ServicoEscolha>('ordinario');
  const [substituir, setSubstituir] = useState(true);
  const ok = !!h.start && !!h.end;

  const lancar = async () => {
    const { marcacoes } = impactoLancamento(db.entries, datas, 'escala');
    if (marcacoes > 0) {
      const confirmou = await confirmDialog({
        title: 'Lançar escala em dias com indisponibilidade?',
        message: `${marcacoes} indisponibilidade(s) nesses dias serão removidas. Um dia é escala ou indisponibilidade, nunca os dois.`,
        confirmLabel: 'Lançar escala',
      });
      if (!confirmou) return;
    }
    const s = servicoParaGravar(servico);
    atualizar((d) => aplicarTurno(d, datas, h.start, h.end, substituir, { servico: s }), `Turno em ${datas.length} dia(s)`);
    avisarDesfazer(
      `${datas.length} turno(s) de ${formatMinutes(shiftMinutes(h.start, h.end))}${s ? ` (${ROTULO_SERVICO[s].curto})` : ''} lançados`,
    );
    onFeito();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Escala em ${datas.length} dia(s)`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!ok} onClick={lancar}>
            Lançar
          </button>
        </>
      }
    >
      <div className="stack" style={gap(16)}>
        <SlotGrid opcoes={opcoes} selecionado={h} onPick={(o) => setH({ start: o.start, end: o.end })} />
        <CamposHorario start={h.start} end={h.end} onChange={setH} />
        <ServicoSeg value={servico} onChange={setServico} />
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

function LoteIndispSheet({ open, datas, onClose, onFeito }: { open: boolean; datas: string[]; onClose: () => void; onFeito: () => void }) {
  const db = useEscala();
  const [tipo, setTipo] = useState<TipoIndisponibilidade | null>(null);
  const [nota, setNota] = useState('');

  const lancar = async () => {
    if (!tipo) return;
    const { turnos } = impactoLancamento(db.entries, datas, 'indisponibilidade');
    if (turnos > 0) {
      const confirmou = await confirmDialog({
        title: `Lançar ${ROTULO_INDISP[tipo].longo} em ${datas.length} dia(s)?`,
        message: `${turnos} turno(s) nesses dias serão removidos. Um dia é escala ou indisponibilidade, nunca os dois.`,
        confirmLabel: `Lançar ${ROTULO_INDISP[tipo].longo}`,
        danger: true,
      });
      if (!confirmou) return;
    }
    atualizar((d) => marcarIndisponibilidade(d, datas, tipo, nota), `${ROTULO_INDISP[tipo].longo} em ${datas.length} dia(s)`);
    avisarDesfazer(`${ROTULO_INDISP[tipo].longo}: ${datas.length} dia(s)`);
    setTipo(null);
    setNota('');
    onFeito();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Indisponibilidade em ${datas.length} dia(s)`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!tipo} onClick={lancar}>
            Lançar
          </button>
        </>
      }
    >
      <div className="stack" style={gap(16)}>
        <EscolhaIndisp valor={tipo} onEscolher={setTipo} edtMinutos={db.config.edtMinutos} />
        <input className="input" value={nota} placeholder="Observação (opcional)" onChange={(e) => setNota(e.target.value)} />
      </div>
    </Sheet>
  );
}
