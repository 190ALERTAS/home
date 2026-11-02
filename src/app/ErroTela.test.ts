import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ErroTela } from './ErroTela';

describe('aviso de tela que não abriu', () => {
  it('falha ao baixar a tela é tratada como problema de internet', () => {
    for (const msg of [
      'Failed to fetch dynamically imported module: https://x/assets/TafPage.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      'Unable to preload CSS for /home/assets/x.css',
    ]) {
      expect(ErroTela.getDerivedStateFromError(new TypeError(msg))).toEqual({ erro: 'download' });
    }
  });

  it('outro erro (bug na tela) não fala em internet', () => {
    expect(ErroTela.getDerivedStateFromError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toEqual({
      erro: 'falha',
    });
    expect(ErroTela.getDerivedStateFromError('texto')).toEqual({ erro: 'falha' });
  });

  it('sem erro, mostra a tela normalmente', () => {
    const html = renderToString(createElement(ErroTela, { onTentar: () => {}, children: createElement('p', null, 'ok') }));
    expect(html).toContain('ok');
    expect(html).not.toContain('Não deu para abrir esta tela');
  });
});
