import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { toast } from '../../../components/toast';
import { confirmDialog } from '../../../components/dialogs';
import { Seg, gap } from '../../../components/ui';
import {
  DIAS_SEMANA,
  MESES,
  addDays,
  crossesMidnight,
  formatMinutes,
  parseISODate,
  shiftMinutes,
} from '../../../lib/date';
import { track } from '../../../lib/analytics';
import { duplicados } from '../calc';
import {
  ROTULO_INDISP,
  ROTULO_SERVICO,
  indisponibilidadeDe,
  servicoDe,
  type Marcacao,
  type TipoIndisponibilidade,
  type Turno,
} from '../model';
import { adicionarTurno, editarTurno, impactoLancamento, limparDias, marcarIndisponibilidade, remover } from '../ops';
import { atualizar, desfazer, useEscala } from '../store';
import { CamposHorario, ServicoSeg, SlotGrid, servicoParaGravar, useOpcoesHorario, type ServicoEscolha } from './Horarios';
import { EscolhaIndisp, ICONE_INDISP } from './Indisponibilidade';

export function tituloDia(data: string): string {
  const d = parseISODate(data);
  const dia = DIAS_SEMANA[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function avisarDesfazer(titulo: string) {
  toast({
    title: titulo,
    kind: 'success',
    action: {
      label: 'Desfazer',
      onClick: () => {
        const r = desfazer();
        if (r) toast({ title: 'Desfeito', desc: r });
      },
    },
  });
}

/** Rótulo do tipo de serviço para listas ("Extra (GSE)"), vazio no ordinário. */
export function rotuloServico(t: Turno): string {
  const s = servicoDe(t);
  return s === 'ordinario' ? '' : ROTULO_SERVICO[s].longo;
}

function EditorTurno({ turno, onFim }: { turno: Turno; onFim: () => void }) {
  const [h, setH] = useState({ start: turno.start, end: turno.end });
  const [nota, setNota] = useState(turno.note ?? '');
  const [servico, setServico] = useState<ServicoEscolha>(servicoDe(turno));
  return (
    <div className="subcard">
      <CamposHorario start={h.start} end={h.end} onChange={setH} />
      <ServicoSeg value={servico} onChange={setServico} />
      <input className="input" value={nota} placeholder="Observação (opcional)" onChange={(e) => setNota(e.target.value)} />
      <div className="row">
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            atualizar((db) => remover(db, [turno.id]), 'Turno excluído');
            avisarDesfazer('Turno excluído');
            onFim();
          }}
        >
          <Trash2 /> Excluir
        </button>
        <span className="grow" />
        <button type="button" className="btn ghost" onClick={onFim}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!h.start || !h.end}
          onClick={() => {
            // Turno com tipo desconhecido (versão futura) só muda de tipo se o usuário escolher outro.
            const mudouServico = servico !== servicoDe(turno);
            atualizar(
              (db) => editarTurno(db, turno.id, { start: h.start, end: h.end, note: nota, ...(mudouServico ? { servico } : {}) }),
              'Turno editado',
            );
            toast({ title: 'Turno atualizado', kind: 'success' });
            onFim();
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

type Aba = 'escala' | 'indisp';

/**
 * Folha do dia. Duas seções que não se misturam num lançamento: **Escala** (horários de serviço) e
 * **Indisponibilidade** (férias, afastamento, convalescença, EDT/RSP). Escolher um atalho ou um tipo
 * só seleciona; nada é gravado antes de tocar em "Lançar".
 */
export function DiaSheet({ data, onClose, onNavigate }: { data: string | null; onClose: () => void; onNavigate: (d: string) => void }) {
  const db = useEscala();
  const opcoes = useOpcoesHorario(db.entries, db.modelos);
  const [editando, setEditando] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('escala');
  const [h, setH] = useState({ start: '', end: '' });
  const [servico, setServico] = useState<ServicoEscolha>('ordinario');
  const [nota, setNota] = useState('');
  const [indisp, setIndisp] = useState<TipoIndisponibilidade | null>(null);
  const [notaIndisp, setNotaIndisp] = useState('');

  useEffect(() => {
    setEditando(null);
    setH({ start: '', end: '' });
    setServico('ordinario');
    setNota('');
    setIndisp(null);
    setNotaIndisp('');
    // Abre na seção do que o dia já tem (só ao trocar de dia, não a cada lançamento).
    if (data) setAba(db.entries.some((e) => e.date === data && e.kind !== 'turno') ? 'indisp' : 'escala');
  }, [data]);

  if (!data) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const doDia = db.entries.filter((e) => e.date === data);
  const turnos = doDia.filter((e): e is Turno => e.kind === 'turno');
  const marcas = doDia.filter((e): e is Marcacao => e.kind !== 'turno');
  const dups = duplicados(doDia);
  const total = turnos.reduce((s, t) => s + t.minutes, 0);
  const nomeMarcas = [...new Set(marcas.map((m) => ROTULO_INDISP[indisponibilidadeDe(m)].longo))].join(' e ');

  const lancarEscala = async () => {
    if (!h.start || !h.end) return;
    if (impactoLancamento(db.entries, [data], 'escala').marcacoes > 0) {
      const ok = await confirmDialog({
        title: `Lançar escala em dia de ${nomeMarcas}?`,
        message: 'A indisponibilidade deste dia será removida. Um dia é escala ou indisponibilidade, nunca os dois.',
        confirmLabel: 'Lançar escala',
      });
      if (!ok) return;
    }
    const s = servicoParaGravar(servico);
    atualizar((d) => adicionarTurno(d, data, h.start, h.end, nota, s), 'Turno lançado');
    track('escala_turno', { servico });
    if (navigator.vibrate) navigator.vibrate(12);
    avisarDesfazer(`Turno ${h.start}–${h.end}${s ? ` (${ROTULO_SERVICO[s].curto})` : ''} lançado`);
    setH({ start: '', end: '' });
    setServico('ordinario');
    setNota('');
  };

  const lancarIndisp = async () => {
    if (!indisp) return;
    const n = impactoLancamento(db.entries, [data], 'indisponibilidade').turnos;
    if (n > 0) {
      const ok = await confirmDialog({
        title: `Lançar ${ROTULO_INDISP[indisp].longo} neste dia?`,
        message: `${n} turno(s) deste dia serão removidos. Um dia é escala ou indisponibilidade, nunca os dois.`,
        confirmLabel: `Lançar ${ROTULO_INDISP[indisp].longo}`,
        danger: true,
      });
      if (!ok) return;
    }
    atualizar((d) => marcarIndisponibilidade(d, [data], indisp, notaIndisp), `${ROTULO_INDISP[indisp].longo} lançado`);
    track('escala_indisponibilidade', { tipo: indisp });
    avisarDesfazer(`${ROTULO_INDISP[indisp].longo} lançado`);
    setIndisp(null);
    setNotaIndisp('');
  };

  const removerMarca = (m: Marcacao) => {
    const rotulo = ROTULO_INDISP[indisponibilidadeDe(m)].longo;
    atualizar((d) => remover(d, [m.id]), `${rotulo} removido`);
    avisarDesfazer(`${rotulo} removido`);
  };

  return (
    <Sheet
      open={!!data}
      onClose={onClose}
      title={
        <span className="row" style={gap(4)}>
          <button type="button" className="icon-btn" aria-label="Dia anterior" onClick={() => onNavigate(addDays(data, -1))}>
            <ChevronLeft />
          </button>
          <span className="grow" style={{ textAlign: 'center', fontSize: 19 }}>
            {tituloDia(data)}
          </span>
          <button type="button" className="icon-btn" aria-label="Próximo dia" onClick={() => onNavigate(addDays(data, 1))}>
            <ChevronRight />
          </button>
        </span>
      }
      subtitle={
        turnos.length ? `${turnos.length} turno(s) · ${formatMinutes(total)} no dia` : marcas.length ? nomeMarcas : 'Sem lançamentos'
      }
    >
      <div className="stack" style={gap(18)}>
        {turnos.length > 0 && marcas.length > 0 && (
          <div className="callout amber" role="note">
            <TriangleAlert />
            <div>
              Este dia tem escala e indisponibilidade ao mesmo tempo (lançamento antigo). Nada foi alterado; remova o que não
              vale.
            </div>
          </div>
        )}

        {(turnos.length > 0 || marcas.length > 0) && (
          <div className="list">
            {marcas.map((m) => {
              const tipo = indisponibilidadeDe(m);
              const Icon = ICONE_INDISP[tipo];
              return (
                <div key={m.id} className="list-item">
                  <span className="ico">
                    <Icon />
                  </span>
                  <span className="txt">
                    <strong>{ROTULO_INDISP[tipo].longo}</strong>
                    <small>{m.note || 'Indisponibilidade · desconta da carga horária do mês'}</small>
                  </span>
                  <button type="button" className="icon-btn" aria-label={`Remover ${ROTULO_INDISP[tipo].longo}`} onClick={() => removerMarca(m)}>
                    <Trash2 />
                  </button>
                </div>
              );
            })}
            {turnos.map((t) =>
              editando === t.id ? (
                <div key={t.id} style={{ padding: 10 }}>
                  <EditorTurno turno={t} onFim={() => setEditando(null)} />
                </div>
              ) : (
                <button key={t.id} type="button" className="list-item" onClick={() => setEditando(t.id)}>
                  <span className="ico" style={{ color: crossesMidnight(t.start, t.end) ? 'var(--blue)' : 'var(--primary-hi)' }}>
                    {crossesMidnight(t.start, t.end) ? <Moon /> : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>T</span>}
                  </span>
                  <span className="txt">
                    <strong className="tnum">
                      {t.start} – {t.end}
                      {crossesMidnight(t.start, t.end) ? ' (+1 dia)' : ''}
                    </strong>
                    <small>
                      {[rotuloServico(t), t.note || 'Toque para editar'].filter(Boolean).join(' · ')}
                      {t.minutes !== shiftMinutes(t.start, t.end) ? ' · duração registrada na versão anterior' : ''}
                    </small>
                  </span>
                  {servicoDe(t) !== 'ordinario' && (
                    <span className={`badge ${servicoDe(t) === 'gse' ? 'green' : 'blue'}`}>{ROTULO_SERVICO[servicoDe(t)].curto}</span>
                  )}
                  {dups.has(t.id) && (
                    <span className="badge amber" title="Turno repetido no mesmo dia">
                      <TriangleAlert /> Repetido
                    </span>
                  )}
                  <span className="dur" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>
                    {formatMinutes(t.minutes)}
                  </span>
                  <Pencil size={16} className="subtle" />
                </button>
              ),
            )}
          </div>
        )}

        <Seg<Aba>
          value={aba}
          onChange={setAba}
          ariaLabel="O que lançar"
          options={[
            { value: 'escala', label: 'Escala' },
            { value: 'indisp', label: 'Indisponibilidade' },
          ]}
        />

        {aba === 'escala' ? (
          <div className="stack" style={gap(12)}>
            {marcas.length > 0 && (
              <p className="subtle" style={{ fontSize: 13.5 }}>
                Dia marcado como {nomeMarcas}. Lançar um turno remove a indisponibilidade.
              </p>
            )}
            <div className="eyebrow">Horário</div>
            <SlotGrid opcoes={opcoes} selecionado={h} onPick={(o) => setH({ start: o.start, end: o.end })} />
            <CamposHorario start={h.start} end={h.end} onChange={setH} />
            <ServicoSeg value={servico} onChange={setServico} />
            <input className="input" value={nota} placeholder="Observação (opcional)" onChange={(e) => setNota(e.target.value)} />
            <button type="button" className="btn primary lg block" disabled={!h.start || !h.end} onClick={lancarEscala}>
              <Plus /> Lançar {h.start && h.end ? `${h.start}–${h.end}` : 'escala'}
            </button>
          </div>
        ) : (
          <div className="stack" style={gap(12)}>
            {turnos.length > 0 && (
              <p className="subtle" style={{ fontSize: 13.5 }}>
                Este dia tem {turnos.length} turno(s). Lançar uma indisponibilidade remove os turnos.
              </p>
            )}
            <EscolhaIndisp valor={indisp} onEscolher={setIndisp} edtMinutos={db.config.edtMinutos} />
            <input
              className="input"
              value={notaIndisp}
              placeholder="Observação (opcional, ex.: nº do atestado)"
              onChange={(e) => setNotaIndisp(e.target.value)}
            />
            <button type="button" className="btn primary lg block" disabled={!indisp} onClick={lancarIndisp}>
              <Plus /> Lançar {indisp ? ROTULO_INDISP[indisp].longo : 'indisponibilidade'}
            </button>
          </div>
        )}

        {doDia.length > 0 && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              atualizar((d) => limparDias(d, [data]), 'Dia limpo');
              avisarDesfazer('Lançamentos do dia removidos');
            }}
          >
            <Trash2 /> Limpar este dia
          </button>
        )}
      </div>
    </Sheet>
  );
}
