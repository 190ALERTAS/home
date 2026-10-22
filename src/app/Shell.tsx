import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, Ellipsis, History, Moon, Share, SquarePlus, Sun, WifiOff } from 'lucide-react';
import { linkProps, navigate, type RouteId } from '../lib/router';
import { toggleTheme, useTheme } from '../lib/theme';
import { useInstall, useOnline } from '../lib/pwa';
import { Sheet } from '../components/Sheet';
import { toast } from '../components/toast';
import { gap } from '../components/ui';
import { Emblema } from '../components/Emblema';
import { DockContext } from '../components/dock';
import { navegarDeslizando } from '../lib/transicao';
import { quandoPronta, telas } from './telas';
import { APP_VERSION, BOTTOM, DESTAQUE, MORE, NAV, SIDE_EXTRA, SIDE_MAIN, direcaoNav, telasNoCaminho } from './nav';

// As notas de atualização só são baixadas quando alguém abre a folha (o chunk fica no cache offline do PWA).
const NotasSheet = lazy(() => import('../features/atualizacoes/NotasSheet'));

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <a className="brand" {...linkProps('inicio', onClick)}>
      <Emblema size={32} />
      <span className="brand-word">
        <span className="nome">
          190 <span>ALERTAS</span>
        </span>
        <span className="sub">Apoio operacional</span>
      </span>
      <span className="sr-only">(início)</span>
    </a>
  );
}

function ThemeButton() {
  const theme = useTheme();
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}

function InstallButton({ onIOSHelp }: { onIOSHelp: () => void }) {
  const { canPrompt, install, showIOSHelp } = useInstall();
  if (!canPrompt && !showIOSHelp) return null;
  return (
    <button
      type="button"
      className="topbar-install"
      onClick={async () => {
        if (canPrompt) {
          const ok = await install();
          if (ok) toast({ title: 'App instalado!', kind: 'success' });
        } else onIOSHelp();
      }}
    >
      <Download /> Instalar
    </button>
  );
}

export function IOSInstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Instalar no iPhone" subtitle="Leva 10 segundos">
      <ol className="stack" style={{ paddingLeft: 20, margin: 0, ...gap(14) }}>
        <li>
          Toque em <Share size={18} style={{ display: 'inline', verticalAlign: '-3px' }} /> <strong>Compartilhar</strong>{' '}
          na barra do Safari.
        </li>
        <li>
          Escolha <SquarePlus size={18} style={{ display: 'inline', verticalAlign: '-3px' }} />{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </li>
        <li>
          Confirme em <strong>Adicionar</strong>. O 190 ALERTAS abre como um aplicativo, inclusive sem internet.
        </li>
      </ol>
    </Sheet>
  );
}

/**
 * Telas que passam no caminho do deslize até um item distante da barra. Só existe durante a transição:
 * fica fora da tela (logo depois da borda do lado de onde as telas vêm) e o CSS a faz atravessar junto
 * com a tela atual e a nova. É só aparência (cabeçalho de cada tela e blocos vazios).
 */
function TrilhoTelas({ ids, direcao }: { ids: RouteId[]; direcao: 'direita' | 'esquerda' }) {
  return (
    <div className={`trilho-telas ${direcao}`} aria-hidden>
      {ids.map((id) => {
        const Icon = NAV[id].icon;
        return (
          <div key={id} className="trilho-tela">
            <div className="page">
              <header className="page-head">
                <span className="ph-icon">
                  <Icon />
                </span>
                <div className="ph-text">
                  <h1>{NAV[id].long}</h1>
                  <p>{NAV[id].desc}</p>
                </div>
              </header>
              <div className="trilho-bloco" />
              <div className="trilho-bloco curto" />
              <div className="trilho-bloco" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Shell({ route, children }: { route: RouteId | 'notfound'; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  // 'fechada' = ainda não baixou; depois da 1ª abertura a folha fica montada e só alterna aberta/oculta.
  const [notas, setNotas] = useState<'fechada' | 'aberta' | 'oculta'>('fechada');
  const online = useOnline();
  const theme = useTheme();
  const moreActive = MORE.includes(route as RouteId);
  const [slotAcoes, setSlotAcoes] = useState<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  // Itens da barra inferior (e do "Mais") trocam de tela deslizando para o lado do item tocado; indo
  // para um item distante, as telas do meio passam rapidamente no caminho.
  const [trilho, setTrilho] = useState<{ ids: RouteId[]; direcao: 'direita' | 'esquerda' } | null>(null);
  // A tela nova precisa estar baixada antes de deslizar: senão o que entraria seria o "carregando".
  const deslizar = (id: RouteId) => {
    const direcao = direcaoNav(route, id);
    const meio = telasNoCaminho(route, id);
    quandoPronta(id, () =>
      navegarDeslizando(id, direcao, {
        passos: meio.length + 1,
        durante: direcao && meio.length ? () => setTrilho({ ids: meio, direcao }) : undefined,
        depois: () => setTrilho(null),
      }),
    );
  };
  const irQuandoPronta = (id: RouteId) => quandoPronta(id, () => navigate(id));
  // Começa a baixar já no toque (antes do clique completar), se ainda não estiver pronta.
  const preparar = (id: RouteId) => () => void telas.carregar(id).catch(() => undefined);

  // Altura da parte inferior fixa (navegação + barra flutuante da tela) → espaço no fim da página e posição dos avisos.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty('--dock-h', `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    const ro = new ResizeObserver(medir);
    ro.observe(dock);
    medir();
    return () => {
      ro.disconnect();
      raiz.style.removeProperty('--dock-h');
    };
  }, []);

  return (
    <div className="app" data-route={route}>
      <header className="topbar">
        <Brand />
        <span className="topbar-spacer" />
        {!online && (
          <span className="offline-pill" title="Sem conexão — o app continua funcionando">
            <WifiOff /> Offline
          </span>
        )}
        <InstallButton onIOSHelp={() => setIosHelp(true)} />
        <ThemeButton />
      </header>

      <nav className="sidebar" aria-label="Navegação principal">
        <div className="side-titulo">Ferramentas</div>
        {SIDE_MAIN.map((id) => {
          const Icon = NAV[id].icon;
          return (
            <a key={id} className="side-item" {...linkProps(id, undefined, irQuandoPronta)} aria-current={route === id ? 'page' : undefined}>
              <Icon /> {NAV[id].long}
            </a>
          );
        })}
        <div className="side-sep" />
        {SIDE_EXTRA.map((id) => {
          const Icon = NAV[id].icon;
          return (
            <a key={id} className="side-item" {...linkProps(id, undefined, irQuandoPronta)} aria-current={route === id ? 'page' : undefined}>
              <Icon /> {NAV[id].long}
            </a>
          );
        })}
        <button
          type="button"
          className="side-foot"
          aria-haspopup="dialog"
          aria-label={`Notas de atualização, versão ${APP_VERSION}`}
          title="Notas de atualização"
          onClick={() => setNotas('aberta')}
        >
          <span className="side-foot-versao">
            <History aria-hidden /> v{APP_VERSION}
          </span>
          <br />
          Sd Ferrão · 32º BPM
        </button>
      </nav>

      <DockContext.Provider value={slotAcoes}>
        <main className="main" id="conteudo">
          {children}
        </main>
      </DockContext.Provider>

      {trilho && <TrilhoTelas ids={trilho.ids} direcao={trilho.direcao} />}

      <div className="dock" ref={dockRef}>
        <div className="dock-acoes" ref={setSlotAcoes} />
        <nav className="bottom-nav" aria-label="Navegação">
          {BOTTOM.map((id) => {
            const Icon = NAV[id].icon;
            return (
              <a
                key={id}
                className={`nav-item${id === DESTAQUE ? ' nav-destaque' : ''}`}
                {...linkProps(id, undefined, deslizar)}
                onPointerDown={preparar(id)}
                aria-current={route === id ? 'page' : undefined}
                aria-label={NAV[id].long}
              >
                <span className="pill">
                  <Icon />
                </span>
                <span className="nav-rotulo" aria-hidden>
                  {NAV[id].label}
                </span>
              </a>
            );
          })}
          <button
            type="button"
            className="nav-item"
            aria-current={moreActive ? 'page' : undefined}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
          >
            <span className="pill">
              <Ellipsis />
            </span>
            <span className="nav-rotulo">Mais</span>
          </button>
        </nav>
      </div>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais ferramentas">
        <div className="stack" style={gap(14)}>
          <div className="list">
            {MORE.map((id) => {
              const Icon = NAV[id].icon;
              return (
                <a
                  key={id}
                  className="list-item"
                  {...linkProps(id, () => setMoreOpen(false), deslizar)}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <span className="ico" style={route === id ? { borderColor: 'var(--primary-line)', color: 'var(--primary-hi)' } : undefined}>
                    <Icon />
                  </span>
                  <span className="txt">
                    <strong>{NAV[id].long}</strong>
                    <small>{NAV[id].desc}</small>
                  </span>
                </a>
              );
            })}
          </div>
          <div className="list">
            <button type="button" className="list-item" onClick={toggleTheme}>
              <span className="ico">{theme === 'dark' ? <Sun /> : <Moon />}</span>
              <span className="txt">
                <strong>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</strong>
                <small>Alternar a aparência do app</small>
              </span>
            </button>
            <button
              type="button"
              className="list-item"
              aria-haspopup="dialog"
              onClick={() => {
                setMoreOpen(false);
                setNotas('aberta');
              }}
            >
              <span className="ico">
                <History />
              </span>
              <span className="txt">
                <strong>Notas de atualização</strong>
                <small>Novidades da versão {APP_VERSION} e das anteriores</small>
              </span>
            </button>
          </div>
          <p className="subtle" style={{ textAlign: 'center', fontSize: 13 }}>
            190 ALERTAS · versão {APP_VERSION} · Criado por Sd Ferrão (32º BPM)
          </p>
        </div>
      </Sheet>

      <IOSInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />

      {notas !== 'fechada' && (
        <Suspense fallback={null}>
          <NotasSheet open={notas === 'aberta'} onClose={() => setNotas('oculta')} />
        </Suspense>
      )}
    </div>
  );
}
