import { useEffect, useState } from 'react';
import { Sheet } from '../../../components/Sheet';
import { Field, gap } from '../../../components/ui';
import { CampoData } from '../../../components/pickers';
import { confirmDialog } from '../../../components/dialogs';
import { addDays, diffDays, formatDateBR } from '../../../lib/date';
import { ROTULO_INDISP, type TipoIndisponibilidade } from '../model';
import { impactoLancamento, marcarIndisponibilidade } from '../ops';
import { atualizar, useEscala } from '../store';
import { EscolhaIndisp } from './Indisponibilidade';
import { avisarDesfazer } from './DiaSheet';

/** Lança uma indisponibilidade (férias, afastamento, convalescença, EDT/RSP) num intervalo de datas. */
export function PeriodoSheet({ open, onClose, inicioSugerido }: { open: boolean; onClose: () => void; inicioSugerido: string }) {
  const db = useEscala();
  const [tipo, setTipo] = useState<TipoIndisponibilidade>('ferias');
  const [de, setDe] = useState(inicioSugerido);
  const [ate, setAte] = useState(addDays(inicioSugerido, 29));
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (open) {
      setDe(inicioSugerido);
      setAte(addDays(inicioSugerido, tipo === 'ferias' ? 29 : 0));
      setNota('');
    }
  }, [open, inicioSugerido]);

  const dias = diffDays(de, ate) + 1;
  const valido = !!de && !!ate && dias >= 1 && dias <= 366;
  const datas = valido ? Array.from({ length: dias }, (_, i) => addDays(de, i)) : [];
  const turnos = valido ? impactoLancamento(db.entries, datas, 'indisponibilidade').turnos : 0;

  const aplicar = async () => {
    if (turnos > 0) {
      const ok = await confirmDialog({
        title: `Lançar ${ROTULO_INDISP[tipo].longo} em ${dias} dia(s)?`,
        message: `${turnos} turno(s) lançados nesses dias serão removidos. Um dia é escala ou indisponibilidade, nunca os dois.`,
        confirmLabel: `Lançar ${ROTULO_INDISP[tipo].longo}`,
        danger: true,
      });
      if (!ok) return;
    }
    atualizar((d) => marcarIndisponibilidade(d, datas, tipo, nota), `${ROTULO_INDISP[tipo].longo} lançado`);
    avisarDesfazer(`${ROTULO_INDISP[tipo].longo}: ${dias} dia(s) lançados`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Indisponibilidade"
      subtitle="Lance um período inteiro de uma vez."
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!valido} onClick={aplicar}>
            Lançar {valido ? `${dias} dia(s)` : ''}
          </button>
        </>
      }
    >
      <div className="stack" style={gap(16)}>
        <EscolhaIndisp valor={tipo} onEscolher={setTipo} edtMinutos={db.config.edtMinutos} />
        <div className="grid-2">
          <Field label="De">
            <CampoData rotulo="De" titulo="Início do período" atalhos={false} value={de} onChange={setDe} />
          </Field>
          <Field label="Até">
            <CampoData rotulo="Até" titulo="Fim do período" atalhos={false} value={ate} min={de} onChange={setAte} />
          </Field>
        </div>
        <input className="input" value={nota} placeholder="Observação (opcional, ex.: nº do boletim)" onChange={(e) => setNota(e.target.value)} />
        {valido && (
          <p className="subtle" style={{ fontSize: 14 }}>
            {formatDateBR(de)} a {formatDateBR(ate)} · {dias} dia(s).
            {turnos > 0 ? ` ${turnos} turno(s) lançados nesses dias serão removidos.` : ''}
          </p>
        )}
      </div>
    </Sheet>
  );
}
