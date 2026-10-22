import { ESPERA_ENVIO_MS, INTERVALO_CHECAGEM_MS, PERIODICO_MS, esperaAposFalha, getSync } from './estado';
import { assinarEscala } from '../store';

/**
 * Sincronização automática (só com a conta conectada e o automático ligado):
 *
 * - confere a nuvem ao abrir o app, ao voltar para ele (3 min depois da última conferência), ao abrir
 *   a tela da escala e de hora em hora com o app visível — é assim que o celular mostra o que acabou
 *   de ser lançado no computador;
 * - envia o que foi lançado aqui 10 s depois da última alteração (uma rajada de lançamentos vira uma
 *   gravação só), na hora quando o app vai para segundo plano e quando a internet volta.
 *
 * O motor (e o Firebase) só são carregados quando há o que fazer.
 */

/** A cada quanto o relógio interno olha se há conferência vencida ou envio a refazer. */
const TIQUE_MS = 5 * 60_000;
const carregarMotor = () => import('./motor');

function ligado(): boolean {
  const s = getSync();
  return s.ativo && s.auto;
}

/** Já é hora de conferir a nuvem (passou `minimoMs` da última conferência e o automático está livre)? */
export function deveConferir(agora = Date.now(), minimoMs = INTERVALO_CHECAGEM_MS): boolean {
  const s = getSync();
  if (!s.ativo || !s.auto || s.ocupado || s.precisaEntrar || s.permanente) return false;
  if (s.tentativa && agora - s.tentativa < esperaAposFalha(s.falhas ?? 1)) return false;
  return s.checado == null || agora - s.checado >= minimoMs || agora < s.checado;
}

let timerEnvio: ReturnType<typeof setTimeout> | undefined;

async function rodar(origem: 'auto' | 'envio'): Promise<void> {
  const m = await carregarMotor();
  const r = await m.sincronizar(origem);
  // Lançou algo enquanto a sincronização corria: vai no próximo envio.
  if (r.ok && m.pendenteLocal()) agendarEnvio();
}

function agendarEnvio(espera = ESPERA_ENVIO_MS): void {
  if (!ligado()) return;
  clearTimeout(timerEnvio);
  timerEnvio = setTimeout(() => {
    timerEnvio = undefined;
    if (navigator.onLine) void rodar('envio');
  }, espera);
}

function conferir(minimoMs: number): void {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  const s = getSync();
  if (s.ativo && s.auto && s.precisaEntrar) {
    // Sessão dada como perdida: confere se voltou antes de desistir (é barato: o SDK guarda o usuário).
    void carregarMotor()
      .then((m) => m.revalidarSessao())
      .then((voltou) => voltou && conferir(0));
    return;
  }
  if (!deveConferir(Date.now(), minimoMs)) return;
  void rodar('auto');
}

/** Envio pendente (ou que falhou antes) e conferência vencida, conforme o caso. */
function retomar(minimoMs: number): void {
  if (!ligado() || !navigator.onLine) return;
  void carregarMotor().then((m) => (m.pendenteLocal() ? rodar('envio') : conferir(minimoMs)));
}

/** Abrir a tela da escala confere a nuvem (se a última conferência tem 3 min ou mais). */
export function conferirAoAbrirEscala(): void {
  conferir(INTERVALO_CHECAGEM_MS);
}

export function iniciarSyncAutomatico(): () => void {
  const onVisivel = () => {
    if (document.visibilityState === 'visible') conferir(INTERVALO_CHECAGEM_MS);
    else if (timerEnvio !== undefined) {
      // Indo para segundo plano com envio na fila: envia já (o celular pode encerrar o app).
      clearTimeout(timerEnvio);
      timerEnvio = undefined;
      if (navigator.onLine) void rodar('envio');
    }
  };
  const onOnline = () => retomar(INTERVALO_CHECAGEM_MS);
  // Pequena espera na abertura para não competir com o carregamento do app.
  const inicio = setTimeout(() => retomar(0), 1500);
  const tique = setInterval(() => {
    if (document.visibilityState === 'visible' && timerEnvio === undefined) retomar(PERIODICO_MS);
  }, TIQUE_MS);
  const parar = assinarEscala(() => agendarEnvio());
  document.addEventListener('visibilitychange', onVisivel);
  window.addEventListener('online', onOnline);
  return () => {
    clearTimeout(inicio);
    clearInterval(tique);
    clearTimeout(timerEnvio);
    timerEnvio = undefined;
    parar();
    document.removeEventListener('visibilitychange', onVisivel);
    window.removeEventListener('online', onOnline);
  };
}
