import { ESPERA_ENVIO_MS, INTERVALO_CHECAGEM_MS, PERIODICO_MS, esperaAposFalha, getSync } from './estado';
import { assinarEscala, revisaoEscala } from '../store';

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

/**
 * Já é hora de conferir a nuvem (passou `minimoMs` da última conferência e o automático está livre)?
 * `presenca`: a pessoa está usando o app agora — depois de uma falha de rede, o recuo cai para 3 min.
 */
export function deveConferir(agora = Date.now(), minimoMs = INTERVALO_CHECAGEM_MS, presenca = false): boolean {
  const s = getSync();
  if (!s.ativo || !s.auto || s.ocupado || s.precisaEntrar || s.permanente) return false;
  if (s.tentativa) {
    const espera = presenca && s.falhaRede ? Math.min(INTERVALO_CHECAGEM_MS, esperaAposFalha(s.falhas ?? 1)) : esperaAposFalha(s.falhas ?? 1);
    if (agora - s.tentativa < espera && agora >= s.tentativa) return false;
  }
  return s.checado == null || agora - s.checado >= minimoMs || agora < s.checado;
}

let timerEnvio: ReturnType<typeof setTimeout> | undefined;

async function rodar(origem: 'auto' | 'envio', presenca = false): Promise<void> {
  const m = await carregarMotor();
  const r = await m.sincronizar(origem, { presenca });
  // Lançou algo enquanto a sincronização corria: vai no próximo envio. Só alteração nova reagenda —
  // uma pendência que sobrevive a uma sincronização bem-sucedida (ex.: armazenamento cheio) não pode
  // virar uma leitura a cada 10 s.
  if (r.ok && revisaoEscala() !== m.revisaoJaSincronizada() && m.pendenteLocal()) agendarEnvio();
}

function agendarEnvio(espera = ESPERA_ENVIO_MS): void {
  if (!ligado()) return;
  clearTimeout(timerEnvio);
  timerEnvio = setTimeout(() => {
    timerEnvio = undefined;
    if (navigator.onLine) void rodar('envio');
  }, espera);
}

function conferir(minimoMs: number, presenca = true): void {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  const s = getSync();
  if (s.ativo && s.auto && s.precisaEntrar) {
    // Sessão dada como perdida: confere se voltou antes de desistir (é barato: o SDK guarda o usuário).
    void carregarMotor()
      .then((m) => m.revalidarSessao())
      .then((voltou) => voltou && conferir(0, presenca));
    return;
  }
  if (!deveConferir(Date.now(), minimoMs, presenca)) return;
  void rodar('auto', presenca);
}

/**
 * Envio pendente (ou que falhou antes) e conferência vencida, conforme o caso. Envia só se há
 * lançamento que nenhuma sincronização desta abertura levou ainda (ou se nenhuma rodou: o app pode
 * ter sido fechado antes do envio).
 */
function retomar(minimoMs: number, presenca: boolean): void {
  if (!ligado() || !navigator.onLine) return;
  void carregarMotor().then((m) => {
    const visto = m.revisaoJaSincronizada();
    if (m.pendenteLocal() && (visto === null || visto !== revisaoEscala())) void rodar('envio', presenca);
    else conferir(minimoMs, presenca);
  });
}

/** Abrir a tela da escala confere a nuvem (se a última conferência tem 3 min ou mais). */
export function conferirAoAbrirEscala(): void {
  conferir(INTERVALO_CHECAGEM_MS);
}

export function iniciarSyncAutomatico(): () => void {
  const onVisivel = () => {
    if (document.visibilityState === 'visible') retomar(INTERVALO_CHECAGEM_MS, true);
    else if (timerEnvio !== undefined) {
      // Indo para segundo plano com envio na fila: envia já (o celular pode encerrar o app).
      clearTimeout(timerEnvio);
      timerEnvio = undefined;
      if (navigator.onLine) void rodar('envio', true);
    }
  };
  const onOnline = () => retomar(INTERVALO_CHECAGEM_MS, true);
  // Pequena espera na abertura para não competir com o carregamento do app.
  const inicio = setTimeout(() => retomar(0, true), 1500);
  const tique = setInterval(() => {
    if (document.visibilityState === 'visible' && timerEnvio === undefined) retomar(PERIODICO_MS, false);
  }, TIQUE_MS);
  // Só lançamento do usuário (ou de outra aba) agenda envio; aplicar o que veio da nuvem, não.
  let revisaoVista = revisaoEscala();
  const parar = assinarEscala(() => {
    if (revisaoEscala() === revisaoVista) return;
    revisaoVista = revisaoEscala();
    agendarEnvio();
  });
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
