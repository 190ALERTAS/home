import { describe, expect, it } from 'vitest';
import { hrefSeguro, interpretarMarkdown, type Bloco, type Inline } from './interpretador';

const primeiro = (md: string): Bloco => interpretarMarkdown(md)[0];

/** Junta o texto de uma lista de nós inline (para conferir o resultado sem depender da árvore). */
function plano(nos: Inline[]): string {
  return nos
    .map((n) => {
      switch (n.t) {
        case 'texto':
        case 'codigo':
          return n.v;
        case 'negrito':
        case 'italico':
        case 'link':
          return plano(n.c);
        case 'quebra':
          return '\n';
      }
    })
    .join('');
}

describe('interpretarMarkdown: blocos', () => {
  it('reconhece títulos, parágrafos e listas', () => {
    const blocos = interpretarMarkdown('## Novidades\n\n- um\n- dois\n\nTexto final.');
    expect(blocos.map((b) => b.t)).toEqual(['titulo', 'lista', 'paragrafo']);
    expect(blocos[0]).toMatchObject({ t: 'titulo', nivel: 2 });
    expect(blocos[1]).toMatchObject({ t: 'lista', ordenada: false });
    expect((blocos[1] as Extract<Bloco, { t: 'lista' }>).itens).toHaveLength(2);
  });

  it('limita o nível dos títulos e aceita lista numerada com recuo', () => {
    expect(primeiro('###### fundo')).toMatchObject({ t: 'titulo', nivel: 4 });
    const lista = primeiro('1. a\n   - b\n2. c') as Extract<Bloco, { t: 'lista' }>;
    expect(lista.ordenada).toBe(true);
    expect(lista.itens.map((i) => i.nivel)).toEqual([0, 1, 0]);
  });

  it('mantém as quebras de linha dentro do parágrafo', () => {
    const p = primeiro('linha 1\nlinha 2') as Extract<Bloco, { t: 'paragrafo' }>;
    expect(plano(p.c)).toBe('linha 1\nlinha 2');
  });

  it('trata bloco de código sem interpretar o conteúdo', () => {
    const b = primeiro('```\n**não é negrito** <b>x</b>\n```');
    expect(b).toEqual({ t: 'codigo', v: '**não é negrito** x' });
  });

  it('reconhece citação e linha divisória', () => {
    expect(interpretarMarkdown('> nota\n\n---').map((b) => b.t)).toEqual(['citacao', 'linha']);
  });
});

describe('interpretarMarkdown: inline', () => {
  it('negrito, itálico e código', () => {
    const p = primeiro('**forte**, *itálico* e `código`') as Extract<Bloco, { t: 'paragrafo' }>;
    expect(p.c.map((n) => n.t)).toEqual(['negrito', 'texto', 'italico', 'texto', 'codigo']);
  });

  it('não confunde snake_case nem asterisco solto com itálico', () => {
    const p = primeiro('nome_do_arquivo e 2 * 3 * 4') as Extract<Bloco, { t: 'paragrafo' }>;
    expect(p.c).toEqual([{ t: 'texto', v: 'nome_do_arquivo e 2 * 3 * 4' }]);
  });

  it('transforma [texto](url) e endereço solto em link, sem a pontuação final', () => {
    const p = primeiro('Veja [as releases](https://github.com/190ALERTAS/home/releases) ou https://github.com/190ALERTAS/home.') as Extract<
      Bloco,
      { t: 'paragrafo' }
    >;
    const links = p.c.filter((n): n is Extract<Inline, { t: 'link' }> => n.t === 'link');
    expect(links.map((l) => l.href)).toEqual(['https://github.com/190ALERTAS/home/releases', 'https://github.com/190ALERTAS/home']);
    expect(plano(p.c).endsWith('.')).toBe(true);
  });

  it('mantém o parêntese que faz parte do endereço, mas não o que fecha a frase', () => {
    const p = primeiro('(https://exemplo.com/a_(b)) e https://exemplo.com/x)') as Extract<Bloco, { t: 'paragrafo' }>;
    const hrefs = p.c.filter((n): n is Extract<Inline, { t: 'link' }> => n.t === 'link').map((l) => l.href);
    expect(hrefs).toEqual(['https://exemplo.com/a_(b)', 'https://exemplo.com/x']);
  });

  it('funciona com o texto real de uma release (negrito seguido de endereço)', () => {
    const p = primeiro('**Comparação completa:** https://github.com/190ALERTAS/home/compare/v5.1.0...v5.1.1') as Extract<
      Bloco,
      { t: 'paragrafo' }
    >;
    expect(p.c[0]).toMatchObject({ t: 'negrito' });
    expect(p.c[2]).toMatchObject({ t: 'link', href: 'https://github.com/190ALERTAS/home/compare/v5.1.0...v5.1.1' });
  });
});

describe('interpretarMarkdown: segurança', () => {
  it('não cria link para javascript:, data: nem outros esquemas', () => {
    for (const md of ['[x](javascript:alert(1))', '[x](data:text/html;base64,AAAA)', '[x](vbscript:msgbox)', '[x](//evil.com)']) {
      const p = primeiro(md) as Extract<Bloco, { t: 'paragrafo' }>;
      expect(p.c.some((n) => n.t === 'link')).toBe(false);
    }
  });

  it('descarta tags HTML e comentários (o texto interno vira texto puro)', () => {
    const blocos = interpretarMarkdown('<!-- segredo -->\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\nfim');
    const texto = blocos.map((b) => (b.t === 'paragrafo' ? plano(b.c) : '')).join('|');
    expect(texto).not.toContain('<');
    expect(texto).not.toContain('segredo');
    expect(texto).toContain('alert(1)');
    expect(texto).toContain('fim');
  });

  it('guarda "<https://…>" como link comum', () => {
    const p = primeiro('<https://github.com/190ALERTAS/home>') as Extract<Bloco, { t: 'paragrafo' }>;
    expect(p.c).toEqual([{ t: 'link', href: 'https://github.com/190ALERTAS/home', c: [{ t: 'texto', v: 'https://github.com/190ALERTAS/home' }] }]);
  });

  it('hrefSeguro só aceita http e https', () => {
    expect(hrefSeguro('https://github.com/x')).toBe('https://github.com/x');
    expect(hrefSeguro('http://exemplo.com')).toBe('http://exemplo.com/');
    expect(hrefSeguro('javascript:alert(1)')).toBeNull();
    expect(hrefSeguro('ftp://exemplo.com')).toBeNull();
    expect(hrefSeguro('não é url')).toBeNull();
  });

  it('aguenta texto vazio, gigante ou malformado sem lançar erro', () => {
    expect(interpretarMarkdown('')).toEqual([]);
    expect(() => interpretarMarkdown('**'.repeat(5000))).not.toThrow();
    expect(() => interpretarMarkdown('[a](https://x.com'.repeat(2000))).not.toThrow();
    expect(() => interpretarMarkdown('```\nsem fechar')).not.toThrow();
  });
});
