import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useRoute, type RouteId } from '../lib/router';
import { Shell } from './Shell';
import { Toaster, toast } from '../components/toast';
import { DialogHost } from '../components/dialogs';
import InicioPage from '../features/inicio/InicioPage';
import ReleasePage from '../features/release/ReleasePage';
import VeiculoPage from '../features/veiculo/VeiculoPage';
import { NotFoundPage } from '../features/inicio/NotFoundPage';

const loaders = {
  escala: () => import('../features/escala/EscalaPage'),
  croqui: () => import('../features/croqui/CroquiPage'),
  taf: () => import('../features/taf/TafPage'),
  sugestoes: () => import('../features/institucional/SugestoesPage'),
  termos: () => import('../features/institucional/TermosPage'),
} satisfies Partial<Record<RouteId, () => Promise<{ default: ComponentType }>>>;

const PAGES: Record<RouteId, ComponentType> = {
  inicio: InicioPage,
  release: ReleasePage,
  veiculos: VeiculoPage,
  escala: lazy(loaders.escala),
  croqui: lazy(loaders.croqui),
  taf: lazy(loaders.taf),
  sugestoes: lazy(loaders.sugestoes),
  termos: lazy(loaders.termos),
};

function PageFallback() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <span className="spinner" style={{ color: 'var(--primary-hi)', width: 28, height: 28 }} />
    </div>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Procura nova versão a cada hora enquanto o app estiver aberto.
      if (reg) setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast({ title: 'Pronto para uso offline', desc: 'O app funciona mesmo sem internet.', kind: 'success' });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      title: 'Nova versão disponível',
      desc: 'Toque em atualizar para carregar as melhorias.',
      kind: 'info',
      duration: 60_000,
      action: {
        label: 'Atualizar',
        onClick: () => {
          setNeedRefresh(false);
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export function App() {
  const { id } = useRoute();

  // Baixa as telas restantes em segundo plano para navegação instantânea.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const h = idle(() => Object.values(loaders).forEach((load) => void load().catch(() => undefined)));
    return () => {
      if (window.cancelIdleCallback && typeof h === 'number') window.cancelIdleCallback(h);
    };
  }, []);

  const Page = id === 'notfound' ? NotFoundPage : PAGES[id];

  return (
    <>
      <Shell route={id}>
        <Suspense fallback={<PageFallback />}>
          <Page key={id} />
        </Suspense>
      </Shell>
      <Toaster />
      <DialogHost />
      <UpdatePrompt />
    </>
  );
}
