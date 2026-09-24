import { useSyncExternalStore, type MouseEvent as ReactMouseEvent } from 'react';
import { trackPage } from './analytics';

/**
 * Roteador mínimo baseado em caminhos (ex.: /home/escala), compatível com o
 * GitHub Pages: o build gera uma cópia de index.html para cada rota, então
 * links diretos e os endereços antigos da versão 4 continuam funcionando.
 */

export const ROUTES = {
  inicio: { path: '', title: 'Início' },
  release: { path: 'release', title: 'Release' },
  veiculos: { path: 'veiculos', title: 'Alerta de Veículo' },
  escala: { path: 'escala', title: 'Minha Escala' },
  croqui: { path: 'croqui', title: 'Croqui' },
  taf: { path: 'taf', title: 'Calculadora TAF' },
  sugestoes: { path: 'sugestoes', title: 'Sugestões' },
  termos: { path: 'termos', title: 'Termos de Uso' },
} as const;

export type RouteId = keyof typeof ROUTES;

/** Endereços antigos ou alternativos → rota atual. */
export const ALIASES: Record<string, RouteId> = {
  index: 'inicio',
  feedback: 'sugestoes',
  assuntos: 'inicio', // módulo "Assuntos Correntes" foi removido
  veiculo: 'veiculos',
  alerta: 'veiculos',
};

export const BASE = import.meta.env.BASE_URL || '/';

const listeners = new Set<() => void>();

function slugFromPath(pathname: string): string {
  let p = pathname;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    /* mantém original */
  }
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  else if (`${p}/` === BASE) p = '';
  p = p.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.html$/i, '');
  return (p.split('/')[0] ?? '').toLowerCase();
}

export interface Resolved {
  id: RouteId | 'notfound';
  /** true quando o endereço atual não é o canônico (ex.: /feedback → /sugestoes) */
  redirect: boolean;
  slug: string;
}

export function resolveSlug(slug: string): Resolved {
  const match = (Object.keys(ROUTES) as RouteId[]).find((id) => ROUTES[id].path === slug);
  if (match) return { id: match, redirect: false, slug };
  if (slug in ALIASES) return { id: ALIASES[slug], redirect: true, slug };
  return { id: 'notfound', redirect: false, slug };
}

export function hrefFor(id: RouteId): string {
  return BASE + ROUTES[id].path;
}

let current: Resolved = resolveSlug(slugFromPath(location.pathname));

function emit() {
  current = resolveSlug(slugFromPath(location.pathname));
  listeners.forEach((l) => l());
  afterChange();
}

function afterChange() {
  if (current.id !== 'notfound') {
    const title = ROUTES[current.id].title;
    document.title = current.id === 'inicio' ? '190 ALERTAS' : `${title} · 190 ALERTAS`;
    trackPage(location.pathname, title);
  } else {
    document.title = 'Página não encontrada · 190 ALERTAS';
  }
}

window.addEventListener('popstate', emit);

/** Corrige o endereço (ex.: /home/escala.html ou /home/feedback) sem recarregar. */
export function normalizeInitialUrl(): void {
  if (current.id !== 'notfound') {
    const canonical = hrefFor(current.id);
    if (location.pathname !== canonical) {
      history.replaceState(history.state, '', canonical + location.search + location.hash);
    }
  }
  current = resolveSlug(slugFromPath(location.pathname));
  afterChange();
}

export function navigate(id: RouteId, opts: { replace?: boolean; hash?: string } = {}): void {
  const url = hrefFor(id) + (opts.hash ?? '');
  if (url === location.pathname + location.hash) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (opts.replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  window.scrollTo({ top: 0 });
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useRoute(): Resolved {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

/** Props para <a> que navegam sem recarregar a página. */
export function linkProps(id: RouteId, onNavigate?: () => void) {
  return {
    href: hrefFor(id),
    onClick: (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onNavigate?.();
      navigate(id);
    },
  };
}
