import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Focus,
  Map as MapIcon,
  MoveUpRight,
  PencilRuler,
  Plus,
  Redo2,
  Ruler,
  Share2,
  Square,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  FilePlus2,
  RefreshCw,
} from 'lucide-react';
import { Field, Switch, gap } from '../../components/ui';
import { toast } from '../../components/toast';
import { confirmDialog } from '../../components/dialogs';
import { idbDel, idbGet, idbSet } from '../../lib/idb';
import { nowHM, todayISO } from '../../lib/date';
import { canShareFiles, downloadBlob, shareFiles } from '../../lib/share';
import { track } from '../../lib/analytics';
import { CamadasCroqui, Editor, type EditorApi } from './Editor';
import { Painel } from './Painel';
import { Paleta, type EscolhaPaleta } from './Paleta';
import { MapaStep, type ResultadoMapa } from './MapaStep';
import { enderecoDoPonto } from './mapa';
import { exportarCroqui } from './exportar';
import { duplicar, novaLinha, novaVia, novoSimbolo, novoTexto, novoVeiculo } from './elementos';
import { infoVazia, type CroquiDoc, type Elemento, type EstiloLinha, type TipoVia, type VeiculoEl } from './model';
import './croqui.css';

type Etapa = 'local' | 'desenho' | 'exportar';
const K_IDB = 'croqui:atual';

interface Salvo {
  doc: CroquiDoc;
  fundo: Blob | null;
}

const MODELOS_BRANCO: { id: 'vazio' | TipoVia; nome: string }[] = [
  { id: 'vazio', nome: 'Em branco' },
  { id: 'reta', nome: 'Via reta' },
  { id: 'cruzamento', nome: 'Cruzamento' },
  { id: 'entroncamento', nome: 'Entroncamento (T)' },
  { id: 'rotula', nome: 'Rótula' },
];

function Etapas({ etapa, temDoc, onIr }: { etapa: Etapa; temDoc: boolean; onIr: (e: Etapa) => void }) {
  const itens: { id: Etapa; nome: string }[] = [
    { id: 'local', nome: 'Local' },
    { id: 'desenho', nome: 'Desenho' },
    { id: 'exportar', nome: 'Exportar' },
  ];
  const idx = itens.findIndex((i) => i.id === etapa);
  return (
    <ol className="cro-etapas" aria-label="Etapas">
      {itens.map((it, i) => (
        <li key={it.id} className={i < idx ? 'feito' : i === idx ? 'atual' : ''}>
          <button type="button" disabled={!temDoc && i > 0} onClick={() => onIr(it.id)} aria-current={i === idx ? 'step' : undefined}>
            <span className="n">{i + 1}</span>
            <span className="nome">{it.nome}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function CroquiPage() {
  const [etapa, setEtapa] = useState<Etapa>('local');
  const [doc, setDoc] = useState<CroquiDoc | null>(null);
  const [fundo, setFundo] = useState<Blob | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [paleta, setPaleta] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [modoLocal, setModoLocal] = useState<'mapa' | 'branco'>('mapa');
  const [grade, setGrade] = useState(true);
  const [previa, setPrevia] = useState<{ url: string; blob: Blob } | null>(null);
  const [gerando, setGerando] = useState(false);
  const apiRef = useRef<EditorApi | null>(null);
  const exportSvgRef = useRef<SVGSVGElement>(null);
  const hist = useRef<{ passado: Elemento[][]; futuro: Elemento[][]; atual: Elemento[] }>({ passado: [], futuro: [], atual: [] });
  const [, forcar] = useState(0);

  const fundoUrl = useMemo(() => (fundo ? URL.createObjectURL(fundo) : null), [fundo]);
  useEffect(() => () => void (fundoUrl && URL.revokeObjectURL(fundoUrl)), [fundoUrl]);
  useEffect(() => () => void (previa && URL.revokeObjectURL(previa.url)), [previa]);

  // Restaura o croqui em andamento.
  useEffect(() => {
    let vivo = true;
    void idbGet<Salvo>(K_IDB).then((s) => {
      if (!vivo) return;
      if (s?.doc?.version === 1) {
        setDoc(s.doc);
        setFundo(s.fundo ?? null);
        hist.current = { passado: [], futuro: [], atual: s.doc.elementos };
        setEtapa('desenho');
        toast({ title: 'Croqui em andamento restaurado', kind: 'info' });
      }
      setCarregado(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Salvamento automático (IndexedDB, só neste aparelho).
  useEffect(() => {
    if (!carregado || !doc) return;
    const t = setTimeout(() => void idbSet(K_IDB, { doc, fundo } satisfies Salvo), 500);
    return () => clearTimeout(t);
  }, [doc, fundo, carregado]);

  const iniciar = (novo: CroquiDoc, img: Blob | null) => {
    setDoc(novo);
    setFundo(img);
    setSel(null);
    setPrevia(null);
    hist.current = { passado: [], futuro: [], atual: novo.elementos };
    setEtapa('desenho');
  };

  const usarMapa = async (r: ResultadoMapa) => {
    const novo: CroquiDoc = {
      version: 1,
      largura: r.captura.largura,
      altura: r.captura.altura,
      metrosPorUnidade: r.captura.metrosPorUnidade,
      fundo: { tipo: 'mapa', camada: r.camada, lat: r.lat, lng: r.lng, zoom: r.zoom },
      elementos: [],
      info: { ...infoVazia(), data: todayISO(), hora: nowHM() },
      atualizadoEm: new Date().toISOString(),
    };
    iniciar(novo, r.captura.blob);
    track('croqui_mapa', { camada: r.camada, zoom: r.zoom });
    const local = await enderecoDoPonto(r.lat, r.lng);
    if (local) setDoc((d) => (d && !d.info.local ? { ...d, info: { ...d.info, local } } : d));
  };

  const usarBranco = (modelo: 'vazio' | TipoVia) => {
    const largura = 600;
    const altura = 800;
    const mpu = 0.05; // 20 unidades por metro: área de 30 × 40 m
    const elementos: Elemento[] = modelo === 'vazio' ? [] : [novaVia(modelo, largura / 2, altura / 2)];
    iniciar(
      {
        version: 1,
        largura,
        altura,
        metrosPorUnidade: mpu,
        fundo: { tipo: 'branco', grade },
        elementos,
        info: { ...infoVazia(), data: todayISO(), hora: nowHM() },
        atualizadoEm: new Date().toISOString(),
      },
      null,
    );
    track('croqui_branco', { modelo });
  };

  const novoCroqui = async () => {
    if (doc && doc.elementos.length > 0) {
      const ok = await confirmDialog({
        title: 'Começar um novo croqui?',
        message: 'O croqui atual será descartado deste aparelho. Exporte a imagem antes, se precisar dela.',
        confirmLabel: 'Novo croqui',
        danger: true,
      });
      if (!ok) return;
    }
    await idbDel(K_IDB);
    setDoc(null);
    setFundo(null);
    setSel(null);
    setPrevia(null);
    setEtapa('local');
  };

  /* ---------- Histórico ---------- */

  const aplicar = useCallback((elementos: Elemento[], confirmar: boolean) => {
    setDoc((d) => (d ? { ...d, elementos, atualizadoEm: new Date().toISOString() } : d));
    if (confirmar) {
      const h = hist.current;
      if (h.atual !== elementos) {
        h.passado.push(h.atual);
        if (h.passado.length > 60) h.passado.shift();
        h.atual = elementos;
        h.futuro = [];
        forcar((n) => n + 1);
      }
    }
  }, []);

  const desfazer = useCallback(() => {
    const h = hist.current;
    const anterior = h.passado.pop();
    if (!anterior) return;
    h.futuro.push(h.atual);
    h.atual = anterior;
    setDoc((d) => (d ? { ...d, elementos: anterior } : d));
    setSel((s) => (s && anterior.some((e) => e.id === s) ? s : null));
    forcar((n) => n + 1);
  }, []);

  const refazer = useCallback(() => {
    const h = hist.current;
    const proximo = h.futuro.pop();
    if (!proximo) return;
    h.passado.push(h.atual);
    h.atual = proximo;
    setDoc((d) => (d ? { ...d, elementos: proximo } : d));
    forcar((n) => n + 1);
  }, []);

  const elementos = doc?.elementos ?? [];
  const selecionado = elementos.find((e) => e.id === sel) ?? null;

  const adicionar = (el: Elemento) => {
    aplicar([...elementos, el], true);
    setSel(el.id);
  };

  /** Ponto para um novo item: centro da vista, deslocado em cascata se já houver algo ali. */
  const pontoLivre = () => {
    const base = apiRef.current?.centro() ?? { x: (doc?.largura ?? 0) / 2, y: (doc?.altura ?? 0) / 2 };
    if (!doc) return base;
    const passo = 3 / doc.metrosPorUnidade; // 3 m
    const ocupado = (x: number, y: number) =>
      elementos.some((el) => el.kind !== 'via' && el.kind !== 'linha' && Math.hypot(el.x - x, el.y - y) < passo * 0.8);
    let { x, y } = base;
    for (let i = 1; i < 8 && ocupado(x, y); i++) {
      x = base.x + passo * i * 0.9;
      y = base.y + passo * i * 0.6;
    }
    return { x: Math.min(doc.largura, x), y: Math.min(doc.altura, y) };
  };

  const escolherPaleta = (e: EscolhaPaleta) => {
    if (!doc) return;
    const c = pontoLivre();
    if (e.kind === 'veiculo') adicionar(novoVeiculo(e.tipo, c.x, c.y, elementos));
    else if (e.kind === 'simbolo') adicionar(novoSimbolo(e.tipo, c.x, c.y));
    else if (e.kind === 'via') adicionar(novaVia(e.tipo, c.x, c.y));
    else adicionar(novoTexto(c.x, c.y));
  };

  const adicionarLinha = (estilo: EstiloLinha) => {
    if (!doc) return;
    const c = pontoLivre();
    adicionar(novaLinha(estilo, c.x, c.y, doc.metrosPorUnidade, estilo === 'medida' ? 10 : 8));
  };

  const alterarSel = (patch: Partial<Elemento>, confirmar = false) => {
    if (!sel) return;
    const novos = elementos.map((e) => (e.id === sel ? ({ ...e, ...patch } as Elemento) : e));
    aplicar(novos, confirmar);
  };

  const excluirSel = () => {
    if (!sel) return;
    aplicar(
      elementos.filter((e) => e.id !== sel),
      true,
    );
    setSel(null);
  };

  // Atalhos de teclado (desktop)
  useEffect(() => {
    if (etapa !== 'desenho') return;
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        refazer();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        excluirSel();
      } else if (e.key === 'Escape') setSel(null);
      else if (sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const passo = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -passo : e.key === 'ArrowRight' ? passo : 0;
        const dy = e.key === 'ArrowUp' ? -passo : e.key === 'ArrowDown' ? passo : 0;
        aplicar(
          elementos.map((el) =>
            el.id !== sel
              ? el
              : el.kind === 'linha'
                ? { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy, cx: el.cx == null ? null : el.cx + dx, cy: el.cy == null ? null : el.cy + dy }
                : { ...el, x: el.x + dx, y: el.y + dy },
          ),
          true,
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------- Exportação ---------- */

  const gerarPrevia = useCallback(async () => {
    if (!doc || !exportSvgRef.current) return;
    setGerando(true);
    try {
      const blob = await exportarCroqui(exportSvgRef.current, doc, fundo);
      setPrevia({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast({ title: 'Não foi possível gerar a imagem', kind: 'error' });
    } finally {
      setGerando(false);
    }
  }, [doc, fundo]);

  // Prévia sempre atualizada na etapa de exportação (com pequena espera ao digitar).
  const temPrevia = useRef(false);
  temPrevia.current = !!previa;
  useEffect(() => {
    if (etapa !== 'exportar') return;
    const t = setTimeout(() => void gerarPrevia(), temPrevia.current ? 700 : 30);
    return () => clearTimeout(t);
  }, [etapa, gerarPrevia]);

  const nomeArquivo = () => `croqui-${doc?.info.data || todayISO()}-${(doc?.info.hora || nowHM()).replace(':', 'h')}.png`;

  const compartilhar = async () => {
    if (!previa) return;
    const arquivo = new File([previa.blob], nomeArquivo(), { type: 'image/png' });
    track('croqui_exportar', { modo: 'compartilhar' });
    const r = await shareFiles([arquivo], 'Croqui');
    if (r === 'unsupported') downloadBlob(previa.blob, nomeArquivo());
    else if (r === 'error') toast({ title: 'Não foi possível compartilhar', kind: 'error' });
  };

  const setInfo = (patch: Partial<CroquiDoc['info']>) => {
    setDoc((d) => (d ? { ...d, info: { ...d.info, ...patch } } : d));
  };

  const veiculos = elementos.filter((e): e is VeiculoEl => e.kind === 'veiculo');
  const podeCompartilhar = canShareFiles([new File([''], 'x.png', { type: 'image/png' })]);

  return (
    <div className={`page cro-page${etapa === 'desenho' ? ' cro-full' : ''}`}>
      <div className="cro-topo">
        <Etapas
          etapa={etapa}
          temDoc={!!doc}
          onIr={(e) => {
            if (e === 'exportar') setSel(null);
            setEtapa(e);
          }}
        />
        {etapa === 'desenho' && (
          <button type="button" className="btn sm primary" onClick={() => { setSel(null); setEtapa('exportar'); }}>
            Exportar <ArrowRight />
          </button>
        )}
      </div>

      {etapa === 'local' && (
        <div className="stack" style={gap(12)}>
          {doc && (
            <div className="callout blue">
              <PencilRuler />
              <div className="grow">
                Há um croqui em andamento.{' '}
                <button type="button" className="btn sm" onClick={() => setEtapa('desenho')}>
                  Continuar editando
                </button>{' '}
                <button type="button" className="btn sm ghost" onClick={novoCroqui}>
                  Descartar
                </button>
              </div>
            </div>
          )}
          <div className="seg" role="group" aria-label="Tipo de fundo">
            <button type="button" aria-pressed={modoLocal === 'mapa'} onClick={() => setModoLocal('mapa')}>
              <MapIcon size={18} /> Sobre o mapa
            </button>
            <button type="button" aria-pressed={modoLocal === 'branco'} onClick={() => setModoLocal('branco')}>
              <Square size={18} /> Em branco
            </button>
          </div>
          {modoLocal === 'mapa' ? (
            <MapaStep
              onUsar={async (r) => {
                if (doc && doc.elementos.length > 0) {
                  const ok = await confirmDialog({
                    title: 'Substituir o croqui atual?',
                    message: 'Usar uma nova área começa um croqui novo.',
                    confirmLabel: 'Começar novo',
                    danger: true,
                  });
                  if (!ok) return;
                }
                await usarMapa(r);
              }}
            />
          ) : (
            <div className="card pad stack" style={gap(14)}>
              <p className="muted">Desenhe sem mapa, com vias prontas em escala real (área de 30 × 40 m).</p>
              <div className="cro-modelos">
                {MODELOS_BRANCO.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="preset"
                    onClick={async () => {
                      if (doc && doc.elementos.length > 0) {
                        const ok = await confirmDialog({ title: 'Substituir o croqui atual?', confirmLabel: 'Começar novo', danger: true });
                        if (!ok) return;
                      }
                      usarBranco(m.id);
                    }}
                  >
                    <b>{m.nome}</b>
                  </button>
                ))}
              </div>
              <Switch checked={grade} onChange={setGrade} label="Grade de 5 metros" />
            </div>
          )}
        </div>
      )}

      {etapa === 'desenho' && doc && (
        <div className="cro-desenho">
          <div className="cro-toolbar" role="toolbar" aria-label="Ferramentas">
            <button type="button" className="btn sm primary" onClick={() => setPaleta(true)}>
              <Plus /> Adicionar
            </button>
            <button type="button" className="btn sm" onClick={() => adicionarLinha('trajetoria')} title="Seta de trajetória">
              <MoveUpRight /> <span className="lbl">Seta</span>
            </button>
            <button type="button" className="btn sm" onClick={() => adicionarLinha('medida')} title="Medir distância">
              <Ruler /> <span className="lbl">Medir</span>
            </button>
            <button type="button" className="btn sm" onClick={() => escolherPaleta({ kind: 'texto' })} title="Texto">
              <Type /> <span className="lbl">Texto</span>
            </button>
          </div>

          <div className="cro-stage">
            <Editor doc={doc} fundoUrl={fundoUrl} selecionado={sel} onSelecionar={setSel} onAlterar={aplicar} apiRef={apiRef} />
            <div className="cro-hist">
              <button type="button" onClick={desfazer} disabled={!hist.current.passado.length} aria-label="Desfazer" title="Desfazer">
                <Undo2 />
              </button>
              <button type="button" onClick={refazer} disabled={!hist.current.futuro.length} aria-label="Refazer" title="Refazer">
                <Redo2 />
              </button>
            </div>
            <div className="cro-zoom">
              <button type="button" aria-label="Aproximar" onClick={() => apiRef.current?.zoom(1.35)}>
                <ZoomIn />
              </button>
              <button type="button" aria-label="Afastar" onClick={() => apiRef.current?.zoom(1 / 1.35)}>
                <ZoomOut />
              </button>
              <button type="button" aria-label="Enquadrar tudo" onClick={() => apiRef.current?.ajustar()}>
                <Focus />
              </button>
            </div>
            {elementos.length === 0 && !sel && (
              <div className="cro-vazio">
                Toque em <strong>Adicionar</strong> para inserir veículos, pedestres e sinalização. Use dois dedos para aproximar.
              </div>
            )}
            {selecionado && (
              <Painel
                key={selecionado.id}
                el={selecionado}
                mpu={doc.metrosPorUnidade}
                onChange={alterarSel}
                onDuplicar={() => {
                  const copia = duplicar(selecionado, elementos, doc.metrosPorUnidade);
                  adicionar(copia);
                }}
                onFrente={() => aplicar([...elementos.filter((e) => e.id !== selecionado.id), selecionado], true)}
                onExcluir={excluirSel}
                onFechar={() => setSel(null)}
              />
            )}
          </div>
          <Paleta open={paleta} onClose={() => setPaleta(false)} onEscolher={escolherPaleta} />
        </div>
      )}

      {etapa === 'exportar' && doc && (
        <div className="split">
          <div className="section">
            <div className="card pad stack" style={gap(14)}>
              <Field label="Título">
                <input className="input" value={doc.info.titulo} onChange={(e) => setInfo({ titulo: e.target.value })} placeholder="Acidente de trânsito" />
              </Field>
              <div className="grid-2">
                <Field label="Data">
                  <input className="input" type="date" value={doc.info.data} onChange={(e) => setInfo({ data: e.target.value })} />
                </Field>
                <Field label="Hora">
                  <input className="input" type="time" value={doc.info.hora} onChange={(e) => setInfo({ hora: e.target.value })} />
                </Field>
              </div>
              <Field label="Local">
                <input className="input" value={doc.info.local} onChange={(e) => setInfo({ local: e.target.value })} placeholder="Rua, número - bairro, cidade" />
              </Field>
              {veiculos.length > 0 && (
                <div className="stack" style={gap(8)}>
                  <div className="eyebrow">Legenda dos veículos</div>
                  {veiculos.map((v) => (
                    <div key={v.id} className="item-row">
                      <span className="cro-leg-cor" style={{ background: v.cor }}>
                        {v.rotulo}
                      </span>
                      <input
                        className="input"
                        value={v.descricao}
                        placeholder="Ex.: VW Gol branco, placa IXX1D23"
                        onChange={(e) => {
                          aplicar(
                            elementos.map((x) => (x.id === v.id ? { ...x, descricao: e.target.value } : x)),
                            false,
                          );
                        }}
                        onBlur={() => aplicar(elementos, true)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <Field label="Observações">
                <textarea
                  className="textarea"
                  style={{ minHeight: 90 }}
                  value={doc.info.observacoes}
                  onChange={(e) => setInfo({ observacoes: e.target.value })}
                  placeholder="Condições da via, clima, sinalização..."
                />
              </Field>
            </div>
            <div className="row wrap" style={gap(8)}>
              <button type="button" className="btn ghost" onClick={() => setEtapa('desenho')}>
                <ArrowLeft /> Voltar ao desenho
              </button>
              <button type="button" className="btn ghost" onClick={novoCroqui}>
                <FilePlus2 /> Novo croqui
              </button>
            </div>
          </div>
          <aside className="split-aside section">
            <div className="card pad stack" style={gap(12)}>
              <div className="card-title">Imagem final</div>
              <div className="cro-previa">
                {previa ? <img src={previa.url} alt="Prévia do croqui exportado" /> : <div className="empty"><span className="spinner" /> Gerando imagem…</div>}
              </div>
              {gerando && previa && (
                <p className="subtle row" style={{ fontSize: 13, ...gap(6) }}>
                  <RefreshCw size={14} /> Atualizando…
                </p>
              )}
              <div className="grid-2">
                {podeCompartilhar && (
                  <button type="button" className="btn primary" disabled={!previa} onClick={compartilhar}>
                    <Share2 /> Compartilhar
                  </button>
                )}
                <button
                  type="button"
                  className={`btn${podeCompartilhar ? '' : ' primary'}`}
                  disabled={!previa}
                  onClick={() => {
                    if (!previa) return;
                    track('croqui_exportar', { modo: 'baixar' });
                    downloadBlob(previa.blob, nomeArquivo());
                  }}
                  style={podeCompartilhar ? undefined : { gridColumn: '1 / -1' }}
                >
                  <Download /> Baixar PNG
                </button>
              </div>
            </div>
          </aside>
          {/* SVG estático usado apenas para gerar a imagem */}
          <svg ref={exportSvgRef} width={0} height={0} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
            <CamadasCroqui doc={doc} fundoUrl={null} />
          </svg>
        </div>
      )}
    </div>
  );
}
