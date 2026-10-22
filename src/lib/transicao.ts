import { flushSync } from 'react-dom';
import { navigate, type RouteId } from './router';

/**
 * Troca de tela com deslize horizontal, como um carrossel (referência: "Real Simple Slider", de Chris
 * Coyier): a tela atual sai por um lado enquanto a nova entra pelo outro. Indo para um item distante,
 * as telas do meio passam rapidamente no caminho (`durante` desenha esse trilho só durante a
 * transição). Só o conteúdo desliza; a barra superior e a navegação inferior ficam paradas.
 *
 * Usa a View Transitions API (Chrome/Android e Safari 18+), que anima a tela antiga e a nova juntas.
 * Sem ela, só a tela nova entra deslizando. Com "reduzir movimento" ligado no aparelho, não anima.
 */

type Direcao = 'direita' | 'esquerda';

/** Um passo (item vizinho) leva 280 ms; cada tela a mais no caminho soma 90 ms, até 650 ms. */
export function duracaoDeslize(passos: number): number {
  return Math.min(650, 280 + 90 * Math.max(0, passos - 1));
}

function reduzMovimento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

let atual = 0;

export function navegarDeslizando(
  id: RouteId,
  direcao: Direcao | null,
  opcoes: {
    /** Quantas telas o trilho anda (1 = item vizinho). */
    passos?: number;
    /** Roda junto com a troca de tela (desenha o trilho com as telas do meio). */
    durante?: () => void;
    /** Roda quando a transição termina (apaga o trilho). */
    depois?: () => void;
  } = {},
): void {
  if (!direcao || reduzMovimento()) {
    navigate(id);
    return;
  }
  const raiz = document.documentElement;
  const passos = Math.max(1, opcoes.passos ?? 1);
  const ms = duracaoDeslize(passos);
  const minha = ++atual;
  raiz.dataset.deslize = direcao;
  raiz.style.setProperty('--deslize-passos', String(passos));
  raiz.style.setProperty('--deslize-ms', `${ms}ms`);
  // Outro toque antes do fim começa uma transição nova: só a última limpa o que montou.
  const limpar = () => {
    if (minha !== atual) return;
    delete raiz.dataset.deslize;
    delete raiz.dataset.deslizeSimples;
    raiz.style.removeProperty('--deslize-passos');
    raiz.style.removeProperty('--deslize-ms');
    opcoes.depois?.();
  };
  if (typeof document.startViewTransition === 'function') {
    // flushSync: a tela nova (e o trilho) precisam estar no DOM quando a função termina, para a captura do "depois".
    const t = document.startViewTransition(() =>
      flushSync(() => {
        opcoes.durante?.();
        navigate(id);
      }),
    );
    t.finished.then(limpar, limpar);
    return;
  }
  raiz.dataset.deslizeSimples = '';
  flushSync(() => navigate(id));
  window.setTimeout(limpar, ms + 60);
}
