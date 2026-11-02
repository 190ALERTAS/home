import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useRoute, type RouteId } from '../lib/router';
import { Shell } from './Shell';
import { Toaster, toast } from '../components/toast';
import { DialogHost } from '../components/dialogs';
import InicioPage from '../features/inicio/InicioPage';
import ReleasePage from '../features/release/ReleasePage';
import VeiculoPage from '../features/veiculo/VeiculoPage';
import { NotFoundPage } from '../features/inicio/NotFoundPage';
import { iniciarSyncAutomatico } from '../features/escala/sync/auto';
import { telas } from './telas';
import { ErroTela } from './ErroTela';
import { deveReavisar } from '../lib/reaviso';

const PAGES: Record<RouteId, ComponentType> = {
  inicio: InicioPage,
  release: ReleasePage,
  veiculos: VeiculoPage,
  escala: telas.preguicosa('escala'),
  croqui: telas.preguicosa('croqui'),
  taf: telas.preguicosa('taf'),
  sugestoes: telas.preguicosa('sugestoes'),
  termos: telas.preguicosa('termos'),
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

  // O aviso some depois de 60 s; enquanto a versão nova esperar, ele volta quando o app reabre.
  const ultimoAviso = useRef<number | null>(null);
  useEffect(() => {
    if (!needRefresh) return;
    const avisar = () => {
      ultimoAviso.current = Date.now();
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
    };
    avisar();
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && deveReavisar(Date.now(), ultimoAviso.current)) avisar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export function App() {
  const { id } = useRoute();

  // Baixa as telas restantes logo depois de abrir, para navegação instantânea (no app instalado elas
  // já estão no cache offline, então é rápido).
  useEffect(() => {
    const idle = window.requestIdleCallback
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 800 })
      : (cb: () => void) => window.setTimeout(cb, 300);
    const h = idle(() => void telas.carregarTodas());
    return () => {
      if (window.cancelIdleCallback && typeof h === 'number') window.cancelIdleCallback(h);
    };
  }, []);

  // Sincronização automática da escala (só age com a conta conectada e o automático ligado).
  useEffect(() => iniciarSyncAutomatico(), []);

  // "Tentar de novo" depois de uma falha ao abrir a tela: o `lazy` guarda o erro, então cada tentativa
  // usa uma instância nova.
  const [tentativa, setTentativa] = useState(0);

  // Tela já baixada é usada direto (o `lazy` suspenderia e mostraria o "carregando" por um instante).
  const Page = useMemo(() => {
    if (id === 'notfound') return NotFoundPage;
    const pronta = telas.pronta(id);
    if (pronta) return pronta;
    if (tentativa > 0 && !telas.estaPronta(id)) return telas.preguicosa(id as Parameters<typeof telas.preguicosa>[0]);
    return PAGES[id];
  }, [id, tentativa]);

  return (
    <>
      <Shell route={id}>
        <ErroTela key={`${id}:${tentativa}`} onTentar={() => setTentativa((n) => n + 1)}>
          <Suspense fallback={<PageFallback />}>
            <Page key={id} />
          </Suspense>
        </ErroTela>
      </Shell>
      <Toaster />
      <DialogHost />
      <UpdatePrompt />
    </>
  );
}
