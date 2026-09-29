import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Palmtree, Pencil, Plus, Stethoscope, Trash2, CalendarX, TriangleAlert } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { toast } from '../../../components/toast';
import { gap } from '../../../components/ui';
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
import { ROTULO_MARCACAO, type TipoMarcacao, type Turno } from '../model';
import { adicionarTurno, editarTurno, limparDias, marcar, remover } from '../ops';
import { atualizar, desfazer, useEscala } from '../store';
import { CamposHorario, SlotGrid, useOpcoesHorario } from './Horarios';

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

const ICONE_MARCA: Record<TipoMarcacao, typeof Palmtree> = {
  ferias: Palmtree,
  afastamento: Stethoscope,
  edt: CalendarX,
};

function EditorTurno({ turno, onFim }: { turno: Turno; onFim: () => void }) {
  const [h, setH] = useState({ start: turno.start, end: turno.end });
  const [nota, setNota] = useState(turno.note ?? '');
  return (
    <div className="subcard">
      <CamposHorario start={h.start} end={h.end} onChange={setH} />
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
            atualizar((db) => editarTurno(db, turno.id, { start: h.start, end: h.end, note: nota }), 'Turno editado');
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

export function DiaSheet({ data, onClose, onNavigate }: { data: string | null; onClose: () => void; onNavigate: (d: string) => void }) {
  const db = useEscala();
  const opcoes = useOpcoesHorario(db.entries, db.modelos);
  const [editando, setEditando] = useState<string | null>(null);
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [nota, setNota] = useState('');

  useEffect(() => {
    setEditando(null);
    setNota('');
  }, [data]);

  if (!data) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const doDia = db.entries.filter((e) => e.date === data);
  const turnos = doDia.filter((e): e is Turno => e.kind === 'turno');
  const marcas = doDia.filter((e) => e.kind !== 'turno');
  const dups = duplicados(doDia);
  const total = turnos.reduce((s, t) => s + t.minutes, 0);

  const adicionar = (start: string, end: string) => {
    atualizar((d) => adicionarTurno(d, data, start, end, nota), 'Turno adicionado');
    track('escala_turno');
    if (navigator.vibrate) navigator.vibrate(12);
    avisarDesfazer(`Turno ${start}–${end} adicionado`);
    setNota('');
  };

  const alternarMarca = (kind: TipoMarcacao) => {
    const existe = marcas.find((m) => m.kind === kind);
    if (existe) {
      atualizar((d) => remover(d, [existe.id]), `${ROTULO_MARCACAO[kind].longo} removido`);
      avisarDesfazer(`${ROTULO_MARCACAO[kind].longo} removido`);
    } else {
      atualizar((d) => marcar(d, [data], kind), `${ROTULO_MARCACAO[kind].longo} marcado`);
      avisarDesfazer(`${ROTULO_MARCACAO[kind].longo} marcado`);
    }
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
        turnos.length ? `${turnos.length} turno(s) · ${formatMinutes(total)} no dia` : marcas.length ? undefined : 'Sem lançamentos'
      }
    >
      <div className="stack" style={gap(18)}>
        {(turnos.length > 0 || marcas.length > 0) && (
          <div className="list">
            {marcas.map((m) => {
              const Icon = ICONE_MARCA[m.kind as TipoMarcacao];
              return (
                <div key={m.id} className="list-item">
                  <span className="ico">
                    <Icon />
                  </span>
                  <span className="txt">
                    <strong>{ROTULO_MARCACAO[m.kind as TipoMarcacao].longo}</strong>
                    <small>Desconta da carga horária do mês</small>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remover marcação"
                    onClick={() => alternarMarca(m.kind as TipoMarcacao)}
                  >
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
                      {t.note || 'Toque para editar'}
                      {t.minutes !== shiftMinutes(t.start, t.end) ? ' · duração registrada na versão anterior' : ''}
                    </small>
                  </span>
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

        <div className="stack" style={gap(10)}>
          <div className="eyebrow">Adicionar turno — um toque</div>
          <SlotGrid opcoes={opcoes} onPick={(o) => adicionar(o.start, o.end)} />
          <div className="subcard" style={{ gap: 10 }}>
            <CamposHorario start={custom.start} end={custom.end} onChange={setCustom} />
            <div className="item-row">
              <input
                className="input"
                value={nota}
                placeholder="Observação (opcional)"
                onChange={(e) => setNota(e.target.value)}
              />
              <button
                type="button"
                className="btn primary"
                disabled={!custom.start || !custom.end}
                onClick={() => adicionar(custom.start, custom.end)}
              >
                <Plus /> Lançar
              </button>
            </div>
          </div>
        </div>

        <div className="stack" style={gap(10)}>
          <div className="eyebrow">Marcar o dia</div>
          <div className="grid-3">
            {(['ferias', 'afastamento', 'edt'] as TipoMarcacao[]).map((k) => {
              const Icon = ICONE_MARCA[k];
              const on = marcas.some((m) => m.kind === k);
              return (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  style={{ justifyContent: 'center', minHeight: 46, borderRadius: 12 }}
                  onClick={() => alternarMarca(k)}
                >
                  <Icon /> {ROTULO_MARCACAO[k].longo}
                </button>
              );
            })}
          </div>
        </div>

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
