import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteId } from '../lib/router';

type Carregador = () => Promise<{ default: ComponentType }>;

/**
 * Telas baixadas sob demanda (fora do pacote principal).
 *
 * O `React.lazy` suspende na primeira vez que a tela aparece, mesmo com o arquivo já baixado, e o
 * app mostrava o "carregando" por um instante. Aqui cada tela, depois de baixada, fica registrada e
 * passa a ser usada direto. A pré-carga e o toque na navegação esperam a tela ficar pronta.
 */
export function criarTelas<K extends RouteId>(carregadores: Partial<Record<K, Carregador>>) {
  const prontas = new Map<RouteId, ComponentType>();
  const pendentes = new Map<RouteId, Promise<void>>();
  const sobDemanda = (id: RouteId): id is K => id in carregadores;

  function carregar(id: RouteId): Promise<void> {
    if (!sobDemanda(id) || prontas.has(id)) return Promise.resolve();
    let p = pendentes.get(id);
    if (!p) {
      p = carregadores[id]!().then(
        (m) => {
          prontas.set(id, m.default);
          pendentes.delete(id);
        },
        (e: unknown) => {
          // Falhou (sem internet, versão nova publicada): a próxima tentativa baixa de novo.
          pendentes.delete(id);
          throw e;
        },
      );
      pendentes.set(id, p);
    }
    return p;
  }

  return {
    carregar,
    /** A tela já baixada, para usar sem `lazy`; undefined se ainda não baixou ou se vem no pacote principal. */
    pronta: (id: RouteId): ComponentType | undefined => prontas.get(id),
    /** Pode mostrar sem esperar: vem no pacote principal ou já foi baixada. */
    estaPronta: (id: RouteId): boolean => !sobDemanda(id) || prontas.has(id),
    carregarTodas: () => Promise.all((Object.keys(carregadores) as K[]).map((id) => carregar(id).catch(() => undefined))).then(() => undefined),
    /** Versão `lazy` da tela, para a primeira vez (antes de baixar). */
    preguicosa: (id: K): LazyExoticComponent<ComponentType> =>
      lazy(() => carregar(id).then(() => ({ default: prontas.get(id)! }))),
  };
}

export const telas = criarTelas({
  escala: () => import('../features/escala/EscalaPage'),
  croqui: () => import('../features/croqui/CroquiPage'),
  taf: () => import('../features/taf/TafPage'),
  sugestoes: () => import('../features/institucional/SugestoesPage'),
  termos: () => import('../features/institucional/TermosPage'),
});

/** Espera a tela ficar pronta (no máximo `limiteMs`) antes de navegar: sem o "carregando" ao entrar. */
export function quandoPronta(id: RouteId, ir: () => void, limiteMs = 1500): void {
  if (telas.estaPronta(id)) {
    ir();
    return;
  }
  let foi = false;
  const uma = () => {
    if (foi) return;
    foi = true;
    ir();
  };
  telas.carregar(id).then(uma, uma);
  window.setTimeout(uma, limiteMs);
}
