import { INTERVALO_MS, esperaAposFalha, getSync, janela } from './estado';

/**
 * Sincronização automática: ao abrir o app, ao voltar para ele ou ao recuperar a internet, se
 * a janela de 12 h já liberou. O motor (e o Firebase) só são carregados quando há o que fazer.
 */

const CHECAGEM_MS = 5 * 60 * 1000;

export function vencida(agora = Date.now()): boolean {
  const s = getSync();
  if (!s.ativo || !s.auto || s.ocupado || s.precisaEntrar) return false;
  if (s.permanente) return false;
  if (!janela(s.ultima, agora, INTERVALO_MS).aberta) return false;
  return !(s.tentativa && agora - s.tentativa < esperaAposFalha(s.falhas ?? 1));
}

export function iniciarSyncAutomatico(): () => void {
  const verificar = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    const s = getSync();
    if (s.ativo && s.auto && s.precisaEntrar) {
      // Sessão dada como perdida: confere se voltou antes de desistir (é barato: o SDK guarda o usuário).
      void import('./motor').then((m) => m.revalidarSessao()).then((voltou) => voltou && verificar());
      return;
    }
    if (!vencida()) return;
    void import('./motor').then((m) => m.sincronizar('auto'));
  };
  const onVisivel = () => verificar();
  // Pequena espera na abertura para não competir com o carregamento do app.
  const inicio = setTimeout(verificar, 3000);
  const ciclo = setInterval(verificar, CHECAGEM_MS);
  document.addEventListener('visibilitychange', onVisivel);
  window.addEventListener('online', verificar);
  return () => {
    clearTimeout(inicio);
    clearInterval(ciclo);
    document.removeEventListener('visibilitychange', onVisivel);
    window.removeEventListener('online', verificar);
  };
}
