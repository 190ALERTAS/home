import { CalendarX, HeartPulse, Palmtree, Stethoscope, type LucideIcon } from 'lucide-react';
import { formatMinutes } from '../../../lib/date';
import { ROTULO_INDISP, type TipoIndisponibilidade } from '../model';

export const TIPOS_INDISP: TipoIndisponibilidade[] = ['ferias', 'afastamento', 'convalescenca', 'edt'];

export const ICONE_INDISP: Record<TipoIndisponibilidade, LucideIcon> = {
  ferias: Palmtree,
  afastamento: Stethoscope,
  convalescenca: HeartPulse,
  edt: CalendarX,
};

export function descricaoIndisp(t: TipoIndisponibilidade, edtMinutos: number): string {
  switch (t) {
    case 'ferias':
      return 'Desconta a carga do mês proporcionalmente aos dias';
    case 'afastamento':
      return 'Licença, dispensa, diária de viagem, punição com prejuízo do serviço';
    case 'convalescenca':
      return 'Dispensa médica em dia em que estava escalado (em dia de folga, conta como folga)';
    case 'edt':
      return `Desconta ${formatMinutes(edtMinutos)} da carga do mês por dia`;
  }
}

/** Lista para escolher o tipo de indisponibilidade (só seleciona; quem grava é o botão "Lançar"). */
export function EscolhaIndisp({
  valor,
  onEscolher,
  edtMinutos,
}: {
  valor: TipoIndisponibilidade | null;
  onEscolher: (t: TipoIndisponibilidade) => void;
  edtMinutos: number;
}) {
  return (
    <div className="list" role="group" aria-label="Tipo de indisponibilidade">
      {TIPOS_INDISP.map((t) => {
        const Icon = ICONE_INDISP[t];
        const on = t === valor;
        return (
          <button
            key={t}
            type="button"
            className="list-item"
            aria-pressed={on}
            onClick={() => onEscolher(t)}
            style={on ? { background: 'var(--primary-soft)' } : undefined}
          >
            <span className="ico" style={on ? { background: 'var(--primary)', color: '#fff' } : undefined}>
              <Icon />
            </span>
            <span className="txt">
              <strong>{ROTULO_INDISP[t].longo}</strong>
              <small>{descricaoIndisp(t, edtMinutos)}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
