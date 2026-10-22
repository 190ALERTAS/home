/**
 * Devolve uma cópia da lista com o item `i` trocado de lugar com o vizinho `delta` posições
 * adiante (1 = desce, -1 = sobe). Fora dos limites, devolve a própria lista.
 */
export function moverItem<T>(lista: readonly T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista as T[];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}
