import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet } from '../../../components/Sheet';
import { MESES_CURTOS, formatMinutes, monthKey, parseMonthKey } from '../../../lib/date';
import type { Entry } from '../model';

export function MesPicker({
  open,
  onClose,
  mes,
  entries,
  onEscolher,
}: {
  open: boolean;
  onClose: () => void;
  mes: string;
  entries: Entry[];
  onEscolher: (mes: string) => void;
}) {
  const [ano, setAno] = useState(parseMonthKey(mes).year);
  useEffect(() => {
    if (open) setAno(parseMonthKey(mes).year);
  }, [open, mes]);

  const horas = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== 'turno') continue;
    const k = e.date.slice(0, 7);
    horas.set(k, (horas.get(k) ?? 0) + e.minutes);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Escolher mês">
      <div className="row" style={{ justifyContent: 'center', marginBottom: 14 }}>
        <button type="button" className="icon-btn" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)}>
          <ChevronLeft />
        </button>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 26, minWidth: 90, textAlign: 'center' }}>{ano}</strong>
        <button type="button" className="icon-btn" aria-label="Próximo ano" onClick={() => setAno((a) => a + 1)}>
          <ChevronRight />
        </button>
      </div>
      <div className="months">
        {MESES_CURTOS.map((m, i) => {
          const k = monthKey(ano, i + 1);
          const h = horas.get(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={k === mes}
              onClick={() => {
                onEscolher(k);
                onClose();
              }}
            >
              {m}
              <small>{h ? formatMinutes(h) : '—'}</small>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
