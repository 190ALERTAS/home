import { describe, expect, it } from 'vitest';
import { DESTAQUE, direcaoNav } from './nav';

describe('barra inferior', () => {
  it('o destaque (ícone vermelho) é o Início', () => {
    expect(DESTAQUE).toBe('inicio');
  });

  it('ir para um item à direita desliza para a direita; à esquerda, para a esquerda', () => {
    expect(direcaoNav('inicio', 'escala')).toBe('direita');
    expect(direcaoNav('veiculos', 'release')).toBe('esquerda');
    expect(direcaoNav('taf', 'croqui')).toBe('direita');
  });

  it('itens do "Mais" ficam à direita de todos os da barra', () => {
    expect(direcaoNav('veiculos', 'sugestoes')).toBe('direita');
    expect(direcaoNav('termos', 'inicio')).toBe('esquerda');
  });

  it('mesmo item ou tela fora da barra: sem transição', () => {
    expect(direcaoNav('escala', 'escala')).toBeNull();
    expect(direcaoNav('notfound', 'inicio')).toBeNull();
  });
});
