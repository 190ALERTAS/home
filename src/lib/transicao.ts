import { flushSync } from 'react-dom';
import { navigate, type RouteId } from './router';

/**
 * Troca de tela com deslize horizontal, como um carrossel (referência: "Real Simple Slider", de Chris
 * Coyier): a tela atual sai por um lado enquanto a nova entra pelo outro. Só o conteúdo desliza; a
 * barra superior e a navegação inferior ficam paradas.
 *
 * Usa a View Transitions API (Chrome/Android e Safari 18+), que anima a tela antiga e a nova juntas.
 * Sem ela, só a tela nova entra deslizando. Com "reduzir movimento" ligado no aparelho, não anima.
 */

type Direcao = 'direita' | 'esquerda';

const DURACAO_MS = 280;

function reduzMovimento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function navegarDeslizando(id: RouteId, direcao: Direcao | null): void {
  if (!direcao || reduzMovimento()) {
    navigate(id);
    return;
  }
  const raiz = document.documentElement;
  raiz.dataset.deslize = direcao;
  const limpar = () => {
    if (raiz.dataset.deslize === direcao) delete raiz.dataset.deslize;
  };
  if (typeof document.startViewTransition === 'function') {
    // flushSync: a tela nova precisa estar no DOM quando a função termina, para a captura do "depois".
    const t = document.startViewTransition(() => flushSync(() => navigate(id)));
    t.finished.then(limpar, limpar);
    return;
  }
  raiz.dataset.deslizeSimples = '';
  flushSync(() => navigate(id));
  window.setTimeout(() => {
    delete raiz.dataset.deslizeSimples;
    limpar();
  }, DURACAO_MS + 60);
}
