import { Dumbbell, Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
import { Card, PageHead, Seg, gap } from '../../components/ui';
import { usePersistentState } from '../../lib/storage';
import {
  FAIXAS,
  FAIXAS_CONCEITO,
  MAXIMO,
  conceito,
  exercicios,
  infoExercicio,
  pontuar,
  type Conceito,
  type Exercicio,
  type Faixa,
  type Sexo,
} from './calc';
import { TABELA } from './tabela';
import './taf.css';

interface Estado {
  sexo: Sexo;
  faixa: Faixa;
  valores: Partial<Record<Exercicio, string>>;
}

const COR_CONCEITO: Record<Conceito, string> = {
  EXCELENTE: 'green',
  'MUITO BOM': 'blue',
  BOM: 'violet',
  REGULAR: 'amber',
  INSUFICIENTE: 'red',
};

export default function TafPage() {
  const [st, setSt, reset] = usePersistentState<Estado>('190a:taf', { sexo: 'M', faixa: 1, valores: {} });
  const [visao, setVisao] = usePersistentState<'calc' | 'tabela'>('190a:taf:visao', 'calc');
  const lista = exercicios(TABELA, st.sexo, st.faixa);

  const resultados = lista.map((ex) => {
    const bruto = st.valores[ex];
    const valor = bruto === undefined || bruto === '' ? null : Number(bruto);
    const pares = TABELA[st.sexo][st.faixa][ex]!;
    return { ex, valor, info: infoExercicio(ex, st.sexo), p: pontuar(pares, valor ?? -1, MAXIMO[ex]), pares };
  });
  const total = resultados.reduce((s, r) => s + r.p.pontos, 0);
  const preenchidos = resultados.filter((r) => r.valor != null).length;
  const c = conceito(total);

  const setValor = (ex: Exercicio, v: string) => setSt((s) => ({ ...s, valores: { ...s.valores, [ex]: v } }));
  const passo = (ex: Exercicio, delta: number, base: number) => {
    const atual = Number(st.valores[ex] ?? '') || 0;
    const novo = Math.max(0, (st.valores[ex] ? atual : base - delta) + delta);
    setValor(ex, String(novo));
  };

  return (
    <div className="page">
      <PageHead
        icon={Dumbbell}
        title="Calculadora TAF"
        subtitle="Teste de Aptidão Física — NI nº 3.3/EMBM/2023, Anexo “E”."
        actions={
          <button type="button" className="icon-btn" aria-label="Limpar valores" title="Limpar" onClick={() => setSt((s) => ({ ...s, valores: {} }))}>
            <RotateCcw />
          </button>
        }
      />

      <div className="section">
        <Card>
          <div className="stack" style={gap(12)}>
            <Seg<Sexo>
              value={st.sexo}
              onChange={(sexo) => setSt((s) => ({ ...s, sexo }))}
              ariaLabel="Sexo"
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Feminino' },
              ]}
            />
            <div className="taf-faixas" role="group" aria-label="Faixa etária">
              {FAIXAS.map((f) => (
                <button key={f.id} type="button" aria-pressed={st.faixa === f.id} onClick={() => setSt((s) => ({ ...s, faixa: f.id }))} title={f.nome}>
                  <b>{f.curto}</b>
                  <small>anos</small>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Seg<'calc' | 'tabela'>
          value={visao}
          onChange={setVisao}
          ariaLabel="Visão"
          options={[
            { value: 'calc', label: 'Calcular' },
            { value: 'tabela', label: 'Tabela' },
          ]}
        />

        {visao === 'calc' ? (
          <>
            {resultados.map(({ ex, valor, info, p }) => {
              const pct = p.maximo ? p.pontos / p.maximo : 0;
              return (
                <section key={ex} className="card pad taf-ex">
                  <div className="taf-ex-top">
                    <div className="grow">
                      <h2>{info.nome}</h2>
                      <p className="subtle">{info.desc}</p>
                    </div>
                    <div className={`taf-pts${p.pontos === p.maximo ? ' max' : ''}`}>
                      <b>{valor == null ? '—' : p.pontos}</b>
                      <small>/{p.maximo}</small>
                    </div>
                  </div>
                  <div className="taf-stepper">
                    <button type="button" className="btn icon" aria-label={`Diminuir ${info.nome}`} onClick={() => passo(ex, -info.passo, p.minimo)}>
                      <Minus />
                    </button>
                    <div className="taf-input">
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`${info.nome} (${info.unidade})`}
                        placeholder={String(p.minimo)}
                        value={st.valores[ex] ?? ''}
                        onChange={(e) => setValor(ex, e.target.value.replace(/\D/g, '').slice(0, 5))}
                      />
                      <span>{info.unidade}</span>
                    </div>
                    <button type="button" className="btn icon" aria-label={`Aumentar ${info.nome}`} onClick={() => passo(ex, info.passo, p.minimo)}>
                      <Plus />
                    </button>
                  </div>
                  <div className="taf-bar" aria-hidden>
                    <span style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="taf-dica">
                    {valor == null
                      ? `Mínimo para pontuar: ${p.minimo} ${info.unidade}`
                      : p.pontos === p.maximo
                        ? 'Pontuação máxima!'
                        : p.proximo
                          ? `Faltam ${p.proximo.valor - valor} ${info.unidade} para ${p.proximo.pontos} pontos`
                          : ''}
                  </p>
                </section>
              );
            })}

            <div className="taf-total" aria-live="polite">
              <div className="taf-total-num">
                <b>{total}</b>
                <small>/300</small>
              </div>
              <div className="grow">
                <span className={`badge ${COR_CONCEITO[c]}`} style={{ height: 28, fontSize: 14 }}>
                  <Trophy /> {preenchidos === 0 ? 'Informe os índices' : c}
                </span>
                <div className="taf-escala" aria-hidden>
                  <span style={{ width: `${(total / 300) * 100}%` }} />
                  {[151, 211, 255].map((m) => (
                    <i key={m} style={{ left: `${(m / 300) * 100}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="taf-tabelas">
              {resultados.map(({ ex, info, pares }) => (
                <Card key={ex} title={info.nome}>
                  <p className="subtle" style={{ fontSize: 13, marginTop: -6, marginBottom: 10 }}>
                    {info.desc}
                  </p>
                  <table className="taf-tab">
                    <thead>
                      <tr>
                        <th>Índice</th>
                        <th>Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pares.map(([indice, pts]) => (
                        <tr key={indice}>
                          <td>
                            {indice} {info.unidade}
                          </td>
                          <td>{pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
            <Card title="Conceituação">
              <div className="list">
                {FAIXAS_CONCEITO.map((f) => (
                  <div key={f.conceito} className="list-item">
                    <span className={`badge ${COR_CONCEITO[f.conceito]}`}>{f.conceito}</span>
                    <span className="grow" />
                    <span className="tnum muted">{f.de === f.ate ? `${f.de} pontos` : f.de === 0 ? `até ${f.ate} pontos` : `${f.de} a ${f.ate} pontos`}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
        <p className="subtle" style={{ fontSize: 12.5 }}>
          Ferramenta de apoio para treino; o resultado oficial é o registrado pela banca avaliadora.{' '}
          <button type="button" className="btn sm ghost" style={{ minHeight: 24, padding: '0 6px' }} onClick={reset}>
            Restaurar padrão
          </button>
        </p>
      </div>
    </div>
  );
}
