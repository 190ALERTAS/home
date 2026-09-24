import { useId, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { nowHM, todayISO } from '../lib/date';
import { readRecent } from '../lib/storage';
import { Field } from './ui';

/** Data + hora lado a lado, com atalho "Agora". */
export function DateTimeFields({
  data,
  hora,
  onChange,
}: {
  data: string;
  hora: string;
  onChange: (v: { data: string; hora: string }) => void;
}) {
  const idD = useId();
  const idH = useId();
  return (
    <div className="grid-2" style={{ alignItems: 'end' }}>
      <Field label="Data" required htmlFor={idD}>
        <input id={idD} className="input" type="date" value={data} onChange={(e) => onChange({ data: e.target.value, hora })} />
      </Field>
      <Field
        label="Hora"
        required
        htmlFor={idH}
        aside={
          <button
            type="button"
            className="btn sm ghost"
            style={{ minHeight: 24, padding: '0 6px', color: 'var(--primary-hi)' }}
            onClick={() => onChange({ data: todayISO(), hora: nowHM() })}
          >
            <Clock /> Agora
          </button>
        }
      >
        <input id={idH} className="input" type="time" value={hora} onChange={(e) => onChange({ data, hora: e.target.value })} />
      </Field>
    </div>
  );
}

/** Campo de texto com sugestões dos valores usados recentemente neste aparelho. */
export function RecentInput({
  id,
  value,
  onChange,
  recentKey,
  extra = [],
  placeholder,
  upper,
  autoComplete = 'off',
  inputMode,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  recentKey: string;
  extra?: readonly string[];
  placeholder?: string;
  upper?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'search';
}) {
  const listId = useId();
  const options = useMemo(() => {
    const seen = new Set<string>();
    return [...readRecent(recentKey), ...extra].filter((v) => {
      const k = v.toLocaleUpperCase('pt-BR');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [recentKey, extra]);
  return (
    <>
      <input
        id={id}
        className={`input${upper ? ' upper' : ''}`}
        value={value}
        list={options.length ? listId : undefined}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize={upper ? 'characters' : 'sentences'}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}
