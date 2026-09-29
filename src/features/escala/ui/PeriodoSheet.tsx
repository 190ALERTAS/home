import { useEffect, useState } from 'react';
import { CalendarX, Palmtree, Stethoscope } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { Field, gap } from '../../../components/ui';
import { CampoData } from '../../../components/pickers';
import { addDays, diffDays, formatDateBR } from '../../../lib/date';
import { ROTULO_MARCACAO, type TipoMarcacao } from '../model';
import { marcar } from '../ops';
import { atualizar } from '../store';
import { avisarDesfazer } from './DiaSheet';

const OPCOES: { kind: TipoMarcacao; icon: typeof Palmtree; desc: string }[] = [
  { kind: 'ferias', icon: Palmtree, desc: 'Desconta a meta proporcionalmente' },
  { kind: 'afastamento', icon: Stethoscope, desc: 'Licença, atestado, dispensa' },
  { kind: 'edt', icon: CalendarX, desc: 'Desconta horas fixas por dia' },
];

/** Marca férias/afastamento/EDT em um intervalo de datas de uma vez. */
export function PeriodoSheet({ open, onClose, inicioSugerido }: { open: boolean; onClose: () => void; inicioSugerido: string }) {
  const [kind, setKind] = useState<TipoMarcacao>('ferias');
  const [de, setDe] = useState(inicioSugerido);
  const [ate, setAte] = useState(addDays(inicioSugerido, 29));

  useEffect(() => {
    if (open) {
      setDe(inicioSugerido);
      setAte(addDays(inicioSugerido, kind === 'ferias' ? 29 : 0));
    }
  }, [open, inicioSugerido]);

  const dias = diffDays(de, ate) + 1;
  const valido = !!de && !!ate && dias >= 1 && dias <= 366;

  const aplicar = () => {
    const datas = Array.from({ length: dias }, (_, i) => addDays(de, i));
    atualizar((db) => marcar(db, datas, kind), `${ROTULO_MARCACAO[kind].longo} lançado`);
    avisarDesfazer(`${ROTULO_MARCACAO[kind].longo}: ${dias} dia(s) marcados`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Férias e afastamentos"
      subtitle="Marque um período inteiro de uma vez."
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!valido} onClick={aplicar}>
            Marcar {valido ? `${dias} dia(s)` : ''}
          </button>
        </>
      }
    >
      <div className="stack" style={gap(16)}>
        <div className="list">
          {OPCOES.map((o) => {
            const Icon = o.icon;
            const on = o.kind === kind;
            return (
              <button
                key={o.kind}
                type="button"
                className="list-item"
                aria-pressed={on}
                onClick={() => setKind(o.kind)}
                style={on ? { background: 'var(--primary-soft)' } : undefined}
              >
                <span className="ico" style={on ? { background: 'var(--primary)', color: '#fff' } : undefined}>
                  <Icon />
                </span>
                <span className="txt">
                  <strong>{ROTULO_MARCACAO[o.kind].longo}</strong>
                  <small>{o.desc}</small>
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid-2">
          <Field label="De">
            <CampoData rotulo="De" titulo="Início do período" atalhos={false} value={de} onChange={setDe} />
          </Field>
          <Field label="Até">
            <CampoData rotulo="Até" titulo="Fim do período" atalhos={false} value={ate} min={de} onChange={setAte} />
          </Field>
        </div>
        {valido && (
          <p className="subtle" style={{ fontSize: 14 }}>
            {formatDateBR(de)} a {formatDateBR(ate)} · {dias} dia(s). Turnos já lançados nesses dias são mantidos.
          </p>
        )}
      </div>
    </Sheet>
  );
}
