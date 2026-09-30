import { describe, expect, it } from 'vitest';
import { URL_PAGINA_RELEASES, interpretarReleases, mesmaVersao, versaoDaTag } from './releases';

const api = (over: Record<string, unknown> = {}) => ({
  tag_name: 'v5.1.1',
  name: '190 ALERTAS 5.1.1',
  draft: false,
  prerelease: false,
  published_at: '2026-09-30T13:08:03Z',
  html_url: 'https://github.com/190ALERTAS/home/releases/tag/v5.1.1',
  body: '## Novidades\n\n- item',
  ...over,
});

describe('versaoDaTag', () => {
  it('lê tags com e sem "v"', () => {
    expect(versaoDaTag('v5.1.1')).toEqual([5, 1, 1]);
    expect(versaoDaTag('5.2')).toEqual([5, 2, 0]);
    expect(versaoDaTag('nightly')).toBeNull();
  });
});

describe('mesmaVersao (a versão atual abre expandida)', () => {
  it('ignora o "v" e compara os três números', () => {
    expect(mesmaVersao('v5.1.2', '5.1.2')).toBe(true);
    expect(mesmaVersao('5.1.2', '5.1.2')).toBe(true);
    expect(mesmaVersao('v5.1.1', '5.1.2')).toBe(false);
    expect(mesmaVersao('v5.1', '5.1.0')).toBe(true);
  });

  it('nunca confunde tag sem versão numérica com a atual', () => {
    expect(mesmaVersao('nightly', '5.1.2')).toBe(false);
    expect(mesmaVersao('v5.1.2', 'dev')).toBe(false);
  });
});

describe('interpretarReleases', () => {
  it('devolve vazio para o que não for lista', () => {
    expect(interpretarReleases(null)).toEqual([]);
    expect(interpretarReleases({ message: 'Not Found' })).toEqual([]);
    expect(interpretarReleases('x')).toEqual([]);
  });

  it('ordena da versão mais nova para a mais antiga, mesmo com datas fora de ordem', () => {
    const lista = interpretarReleases([
      api({ tag_name: 'v5.0.0', published_at: '2026-09-30T13:07:29Z' }),
      api({ tag_name: 'v5.1.1' }),
      api({ tag_name: 'v5.1.0', published_at: '2026-09-29T03:05:14Z' }),
      api({ tag_name: 'v4.9.10' }),
    ]);
    expect(lista.map((p) => p.tag)).toEqual(['v5.1.1', 'v5.1.0', 'v5.0.0', 'v4.9.10']);
  });

  it('ignora rascunhos e itens sem tag ou malformados', () => {
    const lista = interpretarReleases([api({ draft: true }), api({ tag_name: '' }), null, 7, api({ tag_name: 'v5.1.0' })]);
    expect(lista.map((p) => p.tag)).toEqual(['v5.1.0']);
  });

  it('usa a tag como título quando o nome vem vazio e marca pré-lançamento', () => {
    const [p] = interpretarReleases([api({ name: '', prerelease: true })]);
    expect(p.titulo).toBe('v5.1.1');
    expect(p.preLancamento).toBe(true);
  });

  it('só aceita links do próprio GitHub', () => {
    const [p] = interpretarReleases([api({ html_url: 'https://evil.example/x' })]);
    expect(p.url).toBe(URL_PAGINA_RELEASES);
    const [q] = interpretarReleases([api({ html_url: 'javascript:alert(1)' })]);
    expect(q.url).toBe(URL_PAGINA_RELEASES);
  });

  it('descarta datas inválidas e corta corpos enormes', () => {
    const [p] = interpretarReleases([api({ published_at: 'ontem', created_at: '', body: 'a'.repeat(50_000) })]);
    expect(p.data).toBeNull();
    expect(p.corpo.length).toBe(12_000);
    expect(p.cortado).toBe(true);
  });

  it('aceita corpo nulo (release sem texto)', () => {
    const [p] = interpretarReleases([api({ body: null })]);
    expect(p.corpo).toBe('');
    expect(p.cortado).toBe(false);
  });
});
