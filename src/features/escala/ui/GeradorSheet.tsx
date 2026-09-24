import { useEffect, useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { Field, Seg, Switch, gap } from '../../../components/ui';
import { DIAS_SEMANA_CURTOS, addDays, formatDateBR, formatMinutes, lastDayOfMonth, shiftMonth, weekdayOf } from '../../../lib/date';
import { track } from '../../../lib/analytics';
import { PRESETS, aplicarGerador, preverGerador, type Padrao, type SlotCiclo } from '../gerador';
import { atualizar, useEscala } from '../store';
import { CamposHorario } from './Horarios';
import { avisarDesfazer } from './DiaSheet';

type Ate = 'mes' | 'proximo' | 'data';

function clonePadrao(p: Padrao): Padrao {
  return p.tipo === 'ciclo'
    ? { tipo: 'ciclo', dias: p.dias.map((d) => (d ? { ...d } : null)) }
    : { ...p, diasSemana: [...p.diasSemana] };
}

export function GeradorSheet({ open, onClose, mes, inicioSugerido }: { open: boolean; onClose: () => void; mes: string; inicioSugerido: string }) {
  const db = useEscala();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [padrao, setPadrao] = useState<Padrao>(() => clonePadrao(PRESETS[0].padrao));
  const [inicio, setInicio] = useState(inicioSugerido);
  const [ate, setAte] = useState<Ate>('mes');
  const [fimData, setFimData] = useState(lastDayOfMonth(mes));
  const [pularAusencias, setPular] = useState(true);
  const [substituir, setSubstituir] = useState(false);

  useEffect(() => {
    if (open) {
      setInicio(inicioSugerido);
      setFimData(lastDayOfMonth(mes));
    }
  }, [open, inicioSugerido, mes]);

  const fim = ate === 'mes' ? lastDayOfMonth(inicio.slice(0, 7)) : ate === 'proximo' ? lastDayOfMonth(shiftMonth(inicio.slice(0, 7), 1)) : fimData;
  const previa = useMemo(
    () => preverGerador(db.entries, padrao, { inicio, fim, pularAusencias, substituir }),
    [db.entries, padrao, inicio, fim, pularAusencias, substituir],
  );

  const escolher = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setPadrao(clonePadrao(p.padrao));
  };

  const setSlot = (i: number, slot: SlotCiclo) => {
    if (padrao.tipo !== 'ciclo') return;
    setPadrao({ tipo: 'ciclo', dias: padrao.dias.map((d, j) => (j === i ? slot : d)) });
  };

  const aplicar = () => {
    atualizar((d) => aplicarGerador(d, previa), 'Escala gerada');
    track('escala_gerar', { padrao: presetId });
    avisarDesfazer(`${previa.novos.length} turnos lançados`);
    onClose();
  };

  const nomesSlot = (i: number, total: number) => {
    if (presetId === '12x24-12x48') return i === 0 ? 'Turno do dia' : 'Turno da noite';
    return total > 1 ? `Serviço ${i + 1}` : 'Serviço';
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Gerar escala"
      subtitle="Preenche o período automaticamente no ciclo escolhido."
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={previa.novos.length === 0} onClick={aplicar}>
            <Wand2 /> Lançar {previa.novos.length || ''}
          </button>
        </>
      }
    >
      <div className="stack" style={gap(18)}>
        <div className="presets" role="group" aria-label="Tipo de escala">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset" aria-pressed={presetId === p.id} onClick={() => escolher(p.id)}>
              <b>{p.nome}</b>
              <small>{p.desc}</small>
            </button>
          ))}
        </div>

        {padrao.tipo === 'ciclo' ? (
          <div className="stack" style={gap(12)}>
            <div className="ciclo-strip" aria-label="Ciclo">
              {Array.from({ length: Math.max(8, padrao.dias.length * 2) }, (_, i) => {
                const s = padrao.dias[i % padrao.dias.length];
                const noite = s && s.end <= s.start && s.start !== s.end;
                return (
                  <span key={i} className={s ? (noite ? 'noite' : 'on') : ''}>
                    {DIAS_SEMANA_CURTOS[weekdayOf(addDays(inicio, i))]}
                    <br />
                    {s ? (s.start === s.end ? '24h' : noite ? 'N' : 'D') : 'F'}
                  </span>
                );
              })}
            </div>
            {padrao.dias.map((s, i) =>
              s ? (
                <div key={i} className="stack" style={gap(6)}>
                  <div className="eyebrow">{nomesSlot(i, padrao.dias.filter(Boolean).length)}</div>
                  <CamposHorario start={s.start} end={s.end} onChange={(v) => setSlot(i, v)} />
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <div className="stack" style={gap(12)}>
            <div className="weekdays" role="group" aria-label="Dias da semana">
              {DIAS_SEMANA_CURTOS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={padrao.diasSemana.includes(i)}
                  onClick={() =>
                    setPadrao({
                      ...padrao,
                      diasSemana: padrao.diasSemana.includes(i)
                        ? padrao.diasSemana.filter((x) => x !== i)
                        : [...padrao.diasSemana, i].sort(),
                    })
                  }
                >
                  {d}
                </button>
              ))}
            </div>
            <CamposHorario start={padrao.start} end={padrao.end} onChange={(v) => setPadrao({ ...padrao, ...v })} />
          </div>
        )}

        <div className="grid-2">
          <Field label={padrao.tipo === 'ciclo' ? '1º dia de serviço' : 'A partir de'}>
            <input className="input" type="date" value={inicio} onChange={(e) => e.target.value && setInicio(e.target.value)} />
          </Field>
          <Field label="Até">
            {ate === 'data' ? (
              <input className="input" type="date" value={fimData} onChange={(e) => e.target.value && setFimData(e.target.value)} />
            ) : (
              <input className="input" readOnly value={formatDateBR(fim)} onFocus={() => setAte('data')} />
            )}
          </Field>
        </div>
        <Seg<Ate>
          value={ate}
          onChange={setAte}
          ariaLabel="Período"
          options={[
            { value: 'mes', label: 'Fim do mês' },
            { value: 'proximo', label: '+1 mês' },
            { value: 'data', label: 'Data' },
          ]}
        />

        <div className="stack" style={gap(4)}>
          <Switch checked={pularAusencias} onChange={setPular} label="Pular férias e afastamentos" />
          <Switch
            checked={substituir}
            onChange={setSubstituir}
            label="Substituir turnos já lançados"
            description={substituir ? 'Turnos existentes nos dias do ciclo serão trocados.' : 'Dias que já têm turno ficam como estão.'}
          />
        </div>

        <div className="previa-gerador" aria-live="polite">
          <div>
            <div className="big">{previa.novos.length}</div>
            <div className="eyebrow">turnos</div>
          </div>
          <div>
            <div className="big">{formatMinutes(previa.minutos)}</div>
            <div className="eyebrow">no período</div>
          </div>
          <div className="subtle" style={{ fontSize: 13, marginLeft: 'auto', textAlign: 'right' }}>
            {formatDateBR(inicio)} a {formatDateBR(fim)}
            {previa.pulados > 0 && (
              <>
                <br />
                {previa.pulados} dia(s) pulado(s)
              </>
            )}
            {previa.removidos.length > 0 && (
              <>
                <br />
                {previa.removidos.length} turno(s) substituído(s)
              </>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
