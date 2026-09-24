import { useId } from 'react';
import { FileText, Plus, Trash2, UserRound, Mic } from 'lucide-react';
import { Card, Field, PageHead, Seg, Switch, AutoTextarea, gap } from '../../components/ui';
import { DateTimeFields, RecentInput } from '../../components/fields';
import { MessagePreview, ShareActions } from '../../components/MessageComposer';
import { confirmDialog } from '../../components/dialogs';
import { usePersistentState, pushRecent, readRecent } from '../../lib/storage';
import { nowHM, todayISO } from '../../lib/date';
import { uid } from '../../lib/id';
import {
  FATOS_RAPIDOS,
  FATOS_SUGERIDOS,
  ICONES,
  acrescentarTrecho,
  camposPendentes,
  formatRelease,
  trechosHistorico,
  type Detido,
  type ReleaseData,
  type ReleaseIcone,
} from './format';

const K_PREFS = '190a:release:prefs';
const K_DRAFT = '190a:release:rascunho';
const K_UNIDADES = '190a:recentes:unidades';
const K_CIDADES = '190a:recentes:cidades';
const K_FATOS = '190a:recentes:fatos';
const DIA = 24 * 60 * 60 * 1000;

type Draft = Omit<ReleaseData, 'icone' | 'unidade' | 'negrito'>;
interface Prefs {
  icone: ReleaseIcone;
  unidade: string;
  negrito: boolean;
}

const novoDetido = (): Detido => ({ id: uid(), nome: '', complemento: '', rg: '' });

function novoRascunho(): Draft {
  return {
    fato: '',
    data: todayISO(),
    hora: nowHM(),
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: readRecent(K_CIDADES)[0] ?? '',
    houveApreensao: false,
    apreensoes: [],
    detidos: [novoDetido()],
    historico: '',
    ba: '',
    dp: '',
  };
}

export default function ReleasePage() {
  const [prefs, setPrefs] = usePersistentState<Prefs>(K_PREFS, { icone: '🦅', unidade: '', negrito: false });
  const [draft, setDraft, resetDraft] = usePersistentState<Draft>(K_DRAFT, novoRascunho, { ttlMs: DIA });
  const ids = { unidade: useId(), fato: useId(), log: useId(), num: useId(), bairro: useId(), cidade: useId(), hist: useId(), ba: useId(), dp: useId() };

  const data: ReleaseData = { ...draft, icone: prefs.icone, unidade: prefs.unidade, negrito: prefs.negrito };
  const texto = formatRelease(data);
  const pendentes = camposPendentes(data);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setDetido = (id: string, patch: Partial<Detido>) =>
    setDraft((d) => ({ ...d, detidos: d.detidos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const limpar = async () => {
    const ok = await confirmDialog({
      title: 'Limpar o release?',
      message: 'Os campos da ocorrência serão apagados. A unidade e o ícone escolhidos continuam salvos.',
      confirmLabel: 'Limpar',
      danger: true,
    });
    if (ok) resetDraft();
  };

  const usado = () => {
    pushRecent(K_UNIDADES, prefs.unidade.toLocaleUpperCase('pt-BR'));
    pushRecent(K_CIDADES, draft.cidade.toLocaleUpperCase('pt-BR'));
    pushRecent(K_FATOS, draft.fato.toLocaleUpperCase('pt-BR'), 12);
  };

  return (
    <div className="page split-page">
      <PageHead icon={FileText} title="Release" subtitle="Release de ocorrência no padrão, pronto para o WhatsApp." />

      <div className="split">
        <div className="section">
          <Card title="Título">
            <div className="stack">
              <Field label="Ícone do título">
                <Seg<ReleaseIcone>
                  className="emoji"
                  ariaLabel="Ícone do título"
                  value={prefs.icone}
                  onChange={(icone) => setPrefs((p) => ({ ...p, icone }))}
                  options={ICONES.map((i) => ({ value: i, label: i, title: `Usar ${i}` }))}
                />
              </Field>
              <Field label="Unidade" required htmlFor={ids.unidade} hint="Fica salva para os próximos releases.">
                <RecentInput
                  id={ids.unidade}
                  upper
                  value={prefs.unidade}
                  onChange={(unidade) => setPrefs((p) => ({ ...p, unidade }))}
                  recentKey={K_UNIDADES}
                  placeholder="32º BPM - FORÇA TÁTICA"
                />
              </Field>
            </div>
          </Card>

          <Card title="Ocorrência">
            <div className="stack" style={gap(14)}>
              <Field label="Fato" required htmlFor={ids.fato}>
                <RecentInput
                  id={ids.fato}
                  upper
                  value={draft.fato}
                  onChange={(v) => set('fato', v)}
                  recentKey={K_FATOS}
                  extra={FATOS_SUGERIDOS}
                  placeholder="MANDADO DE PRISÃO"
                />
              </Field>
              <div className="chips scroll" aria-label="Fatos frequentes">
                {FATOS_RAPIDOS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="chip"
                    aria-pressed={draft.fato.toLocaleUpperCase('pt-BR') === f}
                    onClick={() => set('fato', f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <DateTimeFields data={draft.data} hora={draft.hora} onChange={(v) => setDraft((d) => ({ ...d, ...v }))} />
            </div>
          </Card>

          <Card title="Local">
            <div className="stack" style={gap(14)}>
              <Field label="Logradouro" required htmlFor={ids.log}>
                <input
                  id={ids.log}
                  className="input upper"
                  value={draft.logradouro}
                  autoCapitalize="characters"
                  placeholder="RUA ITABUNA"
                  onChange={(e) => set('logradouro', e.target.value)}
                />
              </Field>
              <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr)' }}>
                <Field label="Número" htmlFor={ids.num}>
                  <input
                    id={ids.num}
                    className="input upper"
                    value={draft.numero}
                    placeholder="175"
                    inputMode="text"
                    onChange={(e) => set('numero', e.target.value)}
                  />
                </Field>
                <Field label="Bairro" htmlFor={ids.bairro}>
                  <input
                    id={ids.bairro}
                    className="input upper"
                    value={draft.bairro}
                    autoCapitalize="characters"
                    placeholder="CENTENÁRIO"
                    onChange={(e) => set('bairro', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Cidade" required htmlFor={ids.cidade}>
                <RecentInput
                  id={ids.cidade}
                  upper
                  value={draft.cidade}
                  onChange={(v) => set('cidade', v)}
                  recentKey={K_CIDADES}
                  placeholder="SAPIRANGA"
                />
              </Field>
            </div>
          </Card>

          <Card title="Apreensão">
            <div className="stack">
              <Switch
                checked={draft.houveApreensao}
                onChange={(on) =>
                  setDraft((d) => ({
                    ...d,
                    houveApreensao: on,
                    apreensoes: on && d.apreensoes.length === 0 ? [''] : d.apreensoes,
                  }))
                }
                label="Houve apreensão"
                description={draft.houveApreensao ? 'Um item por linha.' : 'Desligado: sai “Sem Apreensões”.'}
              />
              {draft.houveApreensao && (
                <div className="stack" style={gap(8)}>
                  {draft.apreensoes.map((item, i) => (
                    <div className="item-row" key={i}>
                      <input
                        className="input"
                        value={item}
                        placeholder={i === 0 ? '01 revólver calibre .38' : 'Outro item'}
                        aria-label={`Item apreendido ${i + 1}`}
                        onChange={(e) => set('apreensoes', draft.apreensoes.map((x, j) => (j === i ? e.target.value : x)))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            set('apreensoes', [...draft.apreensoes, '']);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn icon ghost"
                        aria-label="Remover item"
                        onClick={() => set('apreensoes', draft.apreensoes.filter((_, j) => j !== i))}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn add-btn" onClick={() => set('apreensoes', [...draft.apreensoes, ''])}>
                    <Plus /> Adicionar item
                  </button>
                </div>
              )}
            </div>
          </Card>

          <Card title="Indivíduos detidos">
            <div className="stack">
              {draft.detidos.map((det, i) => (
                <div className="subcard" key={det.id}>
                  <div className="subcard-head">
                    <span className="tag">{i + 1}</span>
                    <span className="title">Indivíduo</span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remover indivíduo ${i + 1}`}
                      onClick={() => set('detidos', draft.detidos.filter((x) => x.id !== det.id))}
                    >
                      <Trash2 />
                    </button>
                  </div>
                  <input
                    className="input"
                    value={det.nome}
                    placeholder="Nome completo"
                    aria-label="Nome completo"
                    autoCapitalize="words"
                    onChange={(e) => setDetido(det.id, { nome: e.target.value })}
                  />
                  <div className="grid-2">
                    <input
                      className="input"
                      value={det.complemento}
                      placeholder="Idade / alcunha"
                      aria-label="Complemento (idade ou alcunha)"
                      onChange={(e) => setDetido(det.id, { complemento: e.target.value })}
                    />
                    <input
                      className="input"
                      value={det.rg}
                      placeholder="RG"
                      aria-label="RG"
                      inputMode="numeric"
                      onChange={(e) => setDetido(det.id, { rg: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              {draft.detidos.length === 0 && (
                <p className="subtle" style={{ fontSize: 14 }}>
                  Sem detidos: sai “INDIVÍDUOS DETIDOS: Nenhum”.
                </p>
              )}
              <button type="button" className="btn add-btn" onClick={() => set('detidos', [...draft.detidos, novoDetido()])}>
                <UserRound /> Adicionar indivíduo
              </button>
            </div>
          </Card>

          <Card title="Histórico">
            <div className="stack">
              <Field
                label="Histórico"
                required
                htmlFor={ids.hist}
                aside={<span className="counter">{draft.historico.length} caracteres</span>}
                hint={
                  <span className="row" style={gap(6)}>
                    <Mic size={14} /> Dica: use o microfone do teclado para ditar.
                  </span>
                }
              >
                <AutoTextarea
                  id={ids.hist}
                  value={draft.historico}
                  minRows={5}
                  placeholder="A equipe da Força Tática, formada pelo Sd..., realizou..."
                  onChange={(e) => set('historico', e.target.value)}
                />
              </Field>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Inserir frase pronta
                </div>
                <div className="chips">
                  {trechosHistorico(draft.dp).map((t) => (
                    <button
                      key={t.rotulo}
                      type="button"
                      className="chip"
                      title={t.texto}
                      onClick={() => set('historico', acrescentarTrecho(draft.historico, t.texto))}
                    >
                      <Plus /> {t.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Registro">
            <div className="stack">
              <div className="grid-2">
                <Field label="BA" htmlFor={ids.ba}>
                  <input
                    id={ids.ba}
                    className="input"
                    value={draft.ba}
                    placeholder="9297/2026"
                    inputMode="numeric"
                    onChange={(e) => set('ba', e.target.value)}
                  />
                </Field>
                <Field label="DP" htmlFor={ids.dp}>
                  <input
                    id={ids.dp}
                    className="input"
                    value={draft.dp}
                    placeholder="7523/2026/100929"
                    inputMode="numeric"
                    onChange={(e) => set('dp', e.target.value)}
                  />
                </Field>
              </div>
              <Switch
                checked={prefs.negrito}
                onChange={(negrito) => setPrefs((p) => ({ ...p, negrito }))}
                label="Rótulos em negrito"
                description="Usa *negrito* do WhatsApp em FATO, DATA, HORA…"
              />
            </div>
          </Card>
        </div>

        <aside className="split-aside section">
          <Card title="Prévia">
            <MessagePreview text={texto} time={draft.hora} />
          </Card>
        </aside>
      </div>

      <ShareActions text={texto} missing={pendentes} onClear={limpar} onUsed={usado} trackId="release" />
    </div>
  );
}
