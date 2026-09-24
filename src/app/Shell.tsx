import { useState, type ReactNode } from 'react';
import { Download, Ellipsis, Moon, Share, SquarePlus, Sun, WifiOff } from 'lucide-react';
import mascote from '../assets/mascote.webp';
import { linkProps, type RouteId } from '../lib/router';
import { toggleTheme, useTheme } from '../lib/theme';
import { useInstall, useOnline } from '../lib/pwa';
import { Sheet } from '../components/Sheet';
import { toast } from '../components/toast';
import { gap } from '../components/ui';
import { APP_VERSION, BOTTOM, MORE, NAV, SIDE_EXTRA, SIDE_MAIN } from './nav';

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <a className="brand" {...linkProps('inicio', onClick)} aria-label="190 ALERTAS — início">
      <span className="brand-avatar">
        <img src={mascote} alt="" width={34} height={34} />
      </span>
      <span className="brand-word">
        <span className="n">190</span>
        <span className="t">ALERTAS</span>
      </span>
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

export function Shell({ route, children }: { route: RouteId | 'notfound'; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const online = useOnline();
  const theme = useTheme();
  const moreActive = MORE.includes(route as RouteId);

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
        <span className="siren-bar" aria-hidden />
      </header>

      <nav className="sidebar" aria-label="Navegação principal">
        {SIDE_MAIN.map((id) => {
          const Icon = NAV[id].icon;
          return (
            <a key={id} className="side-item" {...linkProps(id)} aria-current={route === id ? 'page' : undefined}>
              <Icon /> {NAV[id].long}
            </a>
          );
        })}
        <div className="side-sep" />
        {SIDE_EXTRA.map((id) => {
          const Icon = NAV[id].icon;
          return (
            <a key={id} className="side-item" {...linkProps(id)} aria-current={route === id ? 'page' : undefined}>
              <Icon /> {NAV[id].long}
            </a>
          );
        })}
        <div className="side-foot">
          Versão {APP_VERSION}
          <br />
          Criado por Sd Ferrão · 32º BPM
        </div>
      </nav>

      <main className="main" id="conteudo">
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Navegação">
        {BOTTOM.map((id) => {
          const Icon = NAV[id].icon;
          return (
            <a
              key={id}
              className={`nav-item${id === 'veiculos' ? ' nav-destaque' : ''}`}
              {...linkProps(id)}
              aria-current={route === id ? 'page' : undefined}
            >
              <span className="pill">
                <Icon />
              </span>
              {NAV[id].label}
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
          Mais
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais ferramentas">
        <div className="stack" style={gap(14)}>
          <div className="list">
            {MORE.map((id) => {
              const Icon = NAV[id].icon;
              return (
                <a
                  key={id}
                  className="list-item"
                  {...linkProps(id, () => setMoreOpen(false))}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <span className="ico" style={route === id ? { background: 'var(--primary-soft)', color: 'var(--primary-hi)' } : undefined}>
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
          </div>
          <p className="subtle" style={{ textAlign: 'center', fontSize: 13 }}>
            190 ALERTAS · versão {APP_VERSION} · Criado por Sd Ferrão (32º BPM)
          </p>
        </div>
      </Sheet>

      <IOSInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </div>
  );
}
