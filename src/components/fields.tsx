import { useId, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { nowHM, todayISO } from '../lib/date';
import { readRecent } from '../lib/storage';
import { Field } from './ui';
import { CampoData, CampoHora } from './pickers';

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
        <CampoData id={idD} rotulo="Data" value={data} onChange={(v) => onChange({ data: v, hora })} />
      </Field>
      <Field
        label="Hora"
        required
        htmlFor={idH}
        aside={
          <button type="button" className="btn sm ghost field-aside-btn" onClick={() => onChange({ data: todayISO(), hora: nowHM() })}>
            <Clock /> Agora
          </button>
        }
      >
        <CampoHora id={idH} rotulo="Hora" value={hora} onChange={(v) => onChange({ data, hora: v })} />
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
