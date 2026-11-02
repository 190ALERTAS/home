import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Field } from './ui';

const render = (props: Record<string, unknown>, filho: ReturnType<typeof createElement>) =>
  renderToString(createElement(Field, { label: 'Carga', ...props, children: filho }));

describe('Field liga o rótulo ao campo', () => {
  it('sem htmlFor, gera um id e liga o label ao input', () => {
    const html = render({}, createElement('input'));
    const para = /for="([^"]+)"/.exec(html)?.[1];
    expect(para).toBeTruthy();
    expect(html).toContain(`id="${para}"`);
  });

  it('com htmlFor, mantém o id informado', () => {
    const html = render({ htmlFor: 'meu' }, createElement('input', { id: 'meu' }));
    expect(html).toContain('for="meu"');
    expect(html).toContain('id="meu"');
  });

  it('filho com id próprio não é sobrescrito', () => {
    const html = render({}, createElement('input', { id: 'proprio' }));
    expect(html).toContain('id="proprio"');
    expect(html).toContain('for="proprio"');
  });
});
