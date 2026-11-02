import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ErroTela } from './ErroTela';

describe('aviso de tela que não abriu', () => {
  it('um erro ao montar a tela liga o aviso', () => {
    expect(ErroTela.getDerivedStateFromError()).toEqual({ erro: true });
  });

  it('sem erro, mostra a tela normalmente', () => {
    const html = renderToString(createElement(ErroTela, { onTentar: () => {}, children: createElement('p', null, 'ok') }));
    expect(html).toContain('ok');
    expect(html).not.toContain('Não deu para abrir esta tela');
  });
});
