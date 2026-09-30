import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, RefreshCw, WifiOff } from 'lucide-react';
import { APP_VERSION } from '../../app/nav';
import { Sheet } from '../../components/Sheet';
import { Expansivel, gap } from '../../components/ui';
import { formatDateBR, pad2, toISODate } from '../../lib/date';
import { useOnline } from '../../lib/pwa';
import { Markdown } from './Markdown';
import {
  FalhaReleases,
  VALIDADE_MS,
  buscarReleases,
  guardarCache,
  lerCache,
  mesmaVersao,
  type CacheReleases,
  type MotivoFalha,
  type Publicacao,
} from './releases';
import './atualizacoes.css';

const MENSAGEM: Record<MotivoFalha, string> = {
  rede: 'Não foi possível falar com o GitHub. Verifique a conexão e tente de novo.',
  limite: 'O GitHub limitou as consultas desta rede por enquanto. Tente de novo em alguns minutos.',
  servico: 'O GitHub não respondeu como esperado. Tente de novo mais tarde.',
};

const dataBR = (iso: string) => formatDateBR(toISODate(new Date(iso)));

function quando(ms: number): string {
  const d = new Date(ms);
  return `${formatDateBR(toISODate(d))} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Carrega as notas ao abrir: mostra na hora o que estiver guardado no aparelho e só consulta o GitHub
 * se não houver nada guardado, se estiver velho (VALIDADE_MS) ou se a pessoa pedir. Sem internet, não tenta.
 */
function useNotas(aberto: boolean) {
  const online = useOnline();
  const [cache, setCache] = useState<CacheReleases | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falha, setFalha] = useState<MotivoFalha | null>(null);
  const [pedido, setPedido] = useState(0);
  const forcar = useRef(false);

  useEffect(() => {
    if (!aberto) return;
    const guardado = lerCache();
    setCache(guardado);
    const forcado = forcar.current;
    forcar.current = false;
    const fresco = !!guardado && Date.now() - guardado.em < VALIDADE_MS;
    if (!online || (fresco && !forcado)) {
      setFalha(null);
      return;
    }
    const ctrl = new AbortController();
    setCarregando(true);
    setFalha(null);
    buscarReleases(ctrl.signal)
      .then((itens) => setCache(guardarCache(itens)))
      .catch((e) => {
        if (!ctrl.signal.aborted) setFalha(e instanceof FalhaReleases ? e.motivo : 'rede');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCarregando(false);
      });
    return () => {
      ctrl.abort();
      setCarregando(false);
    };
  }, [aberto, online, pedido]);

  return {
    online,
    cache,
    carregando,
    falha,
    atualizar: () => {
      forcar.current = true;
      setPedido((n) => n + 1);
    },
  };
}

/**
 * Uma versão publicada. Começa recolhida (só selos, data e título no cabeçalho); a versão instalada
 * já começa aberta. A pessoa abre e fecha qualquer uma.
 */
function Versao({ p }: { p: Publicacao }) {
  const atual = mesmaVersao(p.tag, APP_VERSION);
  return (
    <Expansivel
      className="livre notas-item"
      cabecalho={3}
      inicialmenteAberto={atual}
      titulo={
        <>
          <span className="notas-topo">
            <span className="badge red">{p.tag}</span>
            {atual && <span className="badge green">Versão atual</span>}
            {p.preLancamento && <span className="badge amber">Pré-lançamento</span>}
            {p.data && (
              <time className="notas-data mono" dateTime={p.data}>
                {dataBR(p.data)}
              </time>
            )}
          </span>
          <span className="notas-titulo">{p.titulo}</span>
        </>
      }
    >
      {p.corpo ? <Markdown texto={p.corpo} /> : <p className="subtle">Esta versão não tem notas publicadas.</p>}
      {p.cortado && (
        <p className="subtle" style={{ marginTop: 10 }}>
          Texto cortado por ser muito longo.{' '}
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            Ler o texto completo no GitHub
          </a>
          .
        </p>
      )}
    </Expansivel>
  );
}

/** Notas de atualização: as releases do GitHub, da mais nova para a mais antiga. */
export default function NotasSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { online, cache, carregando, falha, atualizar } = useNotas(open);
  const itens = cache?.itens ?? null;

  let aviso: ReactNode = null;
  if (itens && itens.length > 0 && (!online || falha)) {
    aviso = (
      <div className="callout amber" role="status">
        {online ? <CircleAlert aria-hidden /> : <WifiOff aria-hidden />}
        <div>
          {online ? MENSAGEM[falha!] : 'Sem conexão com a internet.'} Mostrando a última lista salva neste aparelho, de{' '}
          {quando(cache!.em)}.
        </div>
      </div>
    );
  }

  let conteudo: ReactNode;
  if (itens && itens.length > 0) {
    conteudo = (
      <section className="notas-lista" aria-label="Versões publicadas">
        {itens.map((p) => (
          <Versao key={p.tag} p={p} />
        ))}
      </section>
    );
  } else if (carregando) {
    conteudo = (
      <div className="empty" role="status">
        <span className="spinner" aria-hidden /> Buscando as notas de atualização…
      </div>
    );
  } else if (!online) {
    conteudo = (
      <div className="callout amber" role="status">
        <WifiOff aria-hidden />
        <div>
          <strong>Sem conexão com a internet.</strong> As notas de atualização precisam de internet e ainda não há
          nenhuma guardada neste aparelho. Conecte-se e abra de novo.
        </div>
      </div>
    );
  } else if (falha) {
    conteudo = (
      <div className="callout red" role="alert">
        <CircleAlert aria-hidden />
        <div>{MENSAGEM[falha]}</div>
      </div>
    );
  } else {
    conteudo = (
      <div className="empty">
        <p>Nenhuma versão publicada ainda.</p>
      </div>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="Notas de atualização"
      subtitle="Novidades de cada versão do app."
      footer={
        <button type="button" className="btn" disabled={carregando || !online} onClick={atualizar}>
          {carregando ? <span className="spinner" aria-hidden /> : <RefreshCw aria-hidden />} Atualizar
        </button>
      }
    >
      <div className="stack" style={gap(16)}>
        <div className="notas-atual">
          <div className="kpi">
            <span className="v">v{APP_VERSION}</span>
            <span className="l">Versão instalada</span>
          </div>
        </div>
        {aviso}
        {conteudo}
      </div>
    </Sheet>
  );
}
