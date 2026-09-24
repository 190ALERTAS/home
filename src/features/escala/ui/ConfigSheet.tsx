import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { toast } from '../../../components/toast';
import { Field, gap } from '../../../components/ui';
import { CampoHora } from '../../../components/pickers';
import { formatMinutes, shiftMinutes } from '../../../lib/date';
import { uid } from '../../../lib/id';
import { EDT_PADRAO, METAS_PADRAO, type Config, type DiasNoMes, type ModeloTurno } from '../model';
import { atualizar, useEscala } from '../store';

const DIAS: DiasNoMes[] = ['31', '30', '29', '28'];

/** Converte "170", "170,5" ou "170:30" em minutos. */
function horasParaMinutos(txt: string): number | null {
  const t = txt.trim().replace(',', '.');
  if (!t) return null;
  const hm = /^(\d{1,3}):(\d{2})$/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 1000 ? Math.round(n * 60) : null;
}

function minutosParaTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${String(m).padStart(2, '0')}` : String(h);
}

export function ConfigSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useEscala();
  const [metas, setMetas] = useState<Record<DiasNoMes, string>>({ '28': '', '29': '', '30': '', '31': '' });
  const [edt, setEdt] = useState('');
  const [perfil, setPerfil] = useState(db.config.perfil);
  const [modelos, setModelos] = useState<ModeloTurno[]>(db.modelos);

  useEffect(() => {
    if (!open) return;
    setMetas({
      '28': minutosParaTexto(db.config.metas['28']),
      '29': minutosParaTexto(db.config.metas['29']),
      '30': minutosParaTexto(db.config.metas['30']),
      '31': minutosParaTexto(db.config.metas['31']),
    });
    setEdt(minutosParaTexto(db.config.edtMinutos));
    setPerfil(db.config.perfil);
    setModelos(db.modelos.map((m) => ({ ...m })));
  }, [open, db.config, db.modelos]);

  const salvar = () => {
    const novasMetas = {} as Config['metas'];
    for (const d of DIAS) {
      const v = horasParaMinutos(metas[d]);
      if (v == null) {
        toast({ title: `Carga horária inválida (${d} dias)`, desc: 'Use horas, ex.: 170 ou 170:30', kind: 'error' });
        return;
      }
      novasMetas[d] = v;
    }
    const edtMin = horasParaMinutos(edt);
    if (edtMin == null) {
      toast({ title: 'Desconto de EDT/RSP inválido', kind: 'error' });
      return;
    }
    const modelosOk = modelos.filter((m) => m.nome.trim() && m.start && m.end).map((m) => ({ ...m, nome: m.nome.trim() }));
    atualizar((d) => ({
      ...d,
      config: { metas: novasMetas, edtMinutos: edtMin, perfil: { nome: perfil.nome.trim(), matricula: perfil.matricula.trim(), unidade: perfil.unidade.trim() } },
      modelos: modelosOk,
    }));
    toast({ title: 'Configurações salvas', kind: 'success' });
    onClose();
  };

  const mig = db.meta.migracaoV1;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Configurações da escala"
      modalLock
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" onClick={salvar}>
            Salvar
          </button>
        </>
      }
    >
      <div className="stack" style={gap(22)}>
        <section className="stack" style={gap(10)}>
          <div className="row">
            <div className="eyebrow grow">Carga horária mensal (horas)</div>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setMetas({
                  '28': minutosParaTexto(METAS_PADRAO['28']),
                  '29': minutosParaTexto(METAS_PADRAO['29']),
                  '30': minutosParaTexto(METAS_PADRAO['30']),
                  '31': minutosParaTexto(METAS_PADRAO['31']),
                });
                setEdt(minutosParaTexto(EDT_PADRAO));
              }}
            >
              <RotateCcw /> Padrão
            </button>
          </div>
          <div className="grid-2">
            {DIAS.map((d) => (
              <Field key={d} label={`Mês de ${d} dias`}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={metas[d]}
                  onChange={(e) => setMetas((m) => ({ ...m, [d]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
          <Field label="Desconto por dia de EDT/RSP (horas)">
            <input className="input" inputMode="decimal" value={edt} onChange={(e) => setEdt(e.target.value)} />
          </Field>
          <p className="subtle" style={{ fontSize: 13 }}>
            Padrão: 177h (31 dias), 170h (30 dias). Férias e afastamentos descontam a carga proporcionalmente aos dias.
          </p>
        </section>

        <section className="stack" style={gap(10)}>
          <div className="row">
            <div className="eyebrow grow">Turnos salvos (atalhos)</div>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setModelos((m) => [...m, { id: uid(), nome: 'Novo turno', start: '08:00', end: '18:00' }])}
            >
              <Plus /> Adicionar
            </button>
          </div>
          {modelos.map((m, i) => (
            <div key={m.id} className="subcard" style={{ gap: 8 }}>
              <div className="item-row">
                <input
                  className="input"
                  value={m.nome}
                  aria-label="Nome do turno"
                  onChange={(e) => setModelos((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="btn icon ghost"
                  aria-label="Remover turno salvo"
                  onClick={() => setModelos((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid-2" style={{ alignItems: 'center' }}>
                <CampoHora
                  rotulo="Início"
                  titulo={`Início · ${m.nome || 'turno'}`}
                  value={m.start}
                  onChange={(v) => setModelos((l) => l.map((x, j) => (j === i ? { ...x, start: v } : x)))}
                />
                <CampoHora
                  rotulo="Fim"
                  titulo={`Fim · ${m.nome || 'turno'}`}
                  value={m.end}
                  onChange={(v) => setModelos((l) => l.map((x, j) => (j === i ? { ...x, end: v } : x)))}
                />
              </div>
              {m.start && m.end && <span className="subtle" style={{ fontSize: 13 }}>Duração: {formatMinutes(shiftMinutes(m.start, m.end))}</span>}
            </div>
          ))}
        </section>

        <section className="stack" style={gap(10)}>
          <div className="eyebrow">Identificação no relatório PDF (opcional)</div>
          <input className="input" placeholder="Nome / posto ou graduação" value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} />
          <div className="grid-2">
            <input className="input" placeholder="Matrícula / ID" value={perfil.matricula} onChange={(e) => setPerfil({ ...perfil, matricula: e.target.value })} />
            <input className="input" placeholder="Unidade" value={perfil.unidade} onChange={(e) => setPerfil({ ...perfil, unidade: e.target.value })} />
          </div>
        </section>

        {mig && (
          <p className="callout blue" style={{ fontSize: 13.5 }}>
            Dados da versão anterior migrados em {new Date(mig.em).toLocaleDateString('pt-BR')}: {mig.registros} registro(s)
            {mig.ignorados ? `, ${mig.ignorados} sem data válida` : ''}. Uma cópia original foi preservada neste aparelho.
          </p>
        )}
      </div>
    </Sheet>
  );
}
