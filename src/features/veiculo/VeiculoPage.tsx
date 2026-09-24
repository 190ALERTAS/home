import { useId, useRef } from 'react';
import { CarFront, KeyRound, Pencil, Siren, UserX } from 'lucide-react';
import { AutoTextarea, Card, Field, PageHead, gap } from '../../components/ui';
import { DateTimeFields, RecentInput } from '../../components/fields';
import { MessagePreview, ShareActions } from '../../components/MessageComposer';
import { confirmDialog } from '../../components/dialogs';
import { pushRecent, readRecent, usePersistentState } from '../../lib/storage';
import { nowHM, todayISO } from '../../lib/date';
import { CORES, FATOS_ALERTA, MODELOS, camposPendentesAlerta, formatAlerta, tipoPlaca, type AlertaData } from './format';
import './veiculo.css';

const K_DRAFT = '190a:alerta:rascunho';
const K_CIDADES = '190a:recentes:cidades';
const K_MODELOS = '190a:recentes:modelos';
const DOZE_HORAS = 12 * 60 * 60 * 1000;

const novo = (): AlertaData => ({
  fato: 'ROUBO DE VEÍCULO',
  placa: '',
  modelo: '',
  cor: '',
  cidade: readRecent(K_CIDADES)[0] ?? '',
  data: todayISO(),
  hora: nowHM(),
  endereco: '',
  historico: '',
});

const ICONE_FATO = {
  'FURTO DE VEÍCULO': KeyRound,
  'ROUBO DE VEÍCULO': Siren,
  'ROUBO DE VEÍCULO COM SEQUESTRO': UserX,
} as const;

export default function VeiculoPage() {
  const [d, setD, reset] = usePersistentState<AlertaData>(K_DRAFT, novo, { ttlMs: DOZE_HORAS });
  const outroRef = useRef<HTMLInputElement>(null);
  const ids = { placa: useId(), modelo: useId(), cor: useId(), cidade: useId(), end: useId(), hist: useId(), outro: useId() };
  const set = <K extends keyof AlertaData>(k: K, v: AlertaData[K]) => setD((x) => ({ ...x, [k]: v }));

  const fatoPadrao = FATOS_ALERTA.some((f) => f.value === d.fato);
  const outro = !fatoPadrao;
  const texto = formatAlerta(d);
  const tipo = tipoPlaca(d.placa);

  const limpar = async () => {
    if (
      await confirmDialog({
        title: 'Limpar o alerta?',
        message: 'Todos os campos serão apagados.',
        confirmLabel: 'Limpar',
        danger: true,
      })
    )
      reset();
  };

  return (
    <div className="page split-page">
      <PageHead icon={CarFront} title="Alerta de veículo" subtitle="Furto ou roubo: preencha e dispare em segundos." />

      <div className="split">
        <div className="section">
          <Card title="Fato">
            <div className="choice-grid" role="group" aria-label="Fato">
              {FATOS_ALERTA.map((f) => {
                const Icon = ICONE_FATO[f.value];
                return (
                  <button
                    key={f.value}
                    type="button"
                    className="choice"
                    aria-pressed={d.fato === f.value}
                    onClick={() => set('fato', f.value)}
                  >
                    <Icon /> {f.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="choice"
                aria-pressed={outro}
                onClick={() => {
                  if (!outro) set('fato', '');
                  setTimeout(() => outroRef.current?.focus(), 30);
                }}
              >
                <Pencil /> Outro
              </button>
            </div>
            {outro && (
              <div style={{ marginTop: 12 }}>
                <Field label="Descreva o fato" htmlFor={ids.outro} hint="Sai como “ALERTA DE …”.">
                  <input
                    ref={outroRef}
                    id={ids.outro}
                    className="input upper"
                    value={d.fato}
                    placeholder="VEÍCULO EM FUGA"
                    autoCapitalize="characters"
                    onChange={(e) => set('fato', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </Card>

          <Card title="Veículo">
            <div className="stack" style={gap(16)}>
              <Field
                label="Placa"
                htmlFor={ids.placa}
                aside={
                  tipo ? (
                    <span className="badge blue">{tipo === 'mercosul' ? 'Mercosul' : 'Padrão antigo'}</span>
                  ) : d.placa.trim() ? (
                    <span className="badge amber">Parcial</span>
                  ) : null
                }
              >
                <div className="plate">
                  <div className="plate-band">
                    <span>BRASIL</span>
                    <span className="flag" aria-hidden />
                  </div>
                  <input
                    id={ids.placa}
                    value={d.placa}
                    placeholder="ABC1D23"
                    maxLength={10}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => set('placa', e.target.value.toLocaleUpperCase('pt-BR'))}
                  />
                </div>
              </Field>
              <Field label="Marca / modelo" htmlFor={ids.modelo}>
                <RecentInput
                  id={ids.modelo}
                  upper
                  value={d.modelo}
                  onChange={(v) => set('modelo', v)}
                  recentKey={K_MODELOS}
                  extra={MODELOS}
                  placeholder="VW GOL"
                />
              </Field>
              <Field label="Cor" htmlFor={ids.cor}>
                <div className="swatches" role="group" aria-label="Cores">
                  {CORES.map((c) => (
                    <button
                      key={c.nome}
                      type="button"
                      className="swatch"
                      aria-pressed={d.cor.toLocaleUpperCase('pt-BR') === c.nome}
                      onClick={() => set('cor', d.cor.toLocaleUpperCase('pt-BR') === c.nome ? '' : c.nome)}
                    >
                      <span className="dot" style={{ background: c.hex }} />
                      {c.nome}
                    </button>
                  ))}
                </div>
                <input
                  id={ids.cor}
                  className="input upper"
                  value={d.cor}
                  placeholder="Ou digite (ex.: PRATA/PRETA)"
                  autoCapitalize="characters"
                  onChange={(e) => set('cor', e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card title="Onde e quando">
            <div className="stack" style={gap(14)}>
              <Field label="Cidade do fato" required htmlFor={ids.cidade}>
                <RecentInput
                  id={ids.cidade}
                  upper
                  value={d.cidade}
                  onChange={(v) => set('cidade', v)}
                  recentKey={K_CIDADES}
                  placeholder="SAPIRANGA"
                />
              </Field>
              <DateTimeFields data={d.data} hora={d.hora} onChange={(v) => setD((x) => ({ ...x, ...v }))} />
              <Field label="Endereço" htmlFor={ids.end}>
                <input
                  id={ids.end}
                  className="input upper"
                  value={d.endereco}
                  placeholder="RUA, NÚMERO, BAIRRO"
                  autoCapitalize="characters"
                  onChange={(e) => set('endereco', e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card title="Histórico">
            <AutoTextarea
              id={ids.hist}
              aria-label="Histórico"
              value={d.historico}
              minRows={4}
              placeholder="Características, suspeitos, sentido de fuga… (use o microfone do teclado)"
              onChange={(e) => set('historico', e.target.value)}
            />
          </Card>
        </div>

        <aside className="split-aside section">
          <Card title="Prévia">
            <MessagePreview text={texto} time={d.hora} />
          </Card>
        </aside>
      </div>

      <ShareActions
        text={texto}
        missing={camposPendentesAlerta(d)}
        onClear={limpar}
        trackId="alerta"
        onUsed={() => {
          pushRecent(K_CIDADES, d.cidade.toLocaleUpperCase('pt-BR'));
          pushRecent(K_MODELOS, d.modelo.toLocaleUpperCase('pt-BR'), 12);
        }}
      />
    </div>
  );
}
