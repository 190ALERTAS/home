/**
 * Interpretador mínimo de markdown para as notas de atualização (texto vindo das releases do GitHub).
 *
 * Devolve uma árvore de dados, nunca HTML: quem desenha (Markdown.tsx) cria elementos React, que
 * escapam todo texto. Tags HTML e comentários do texto original são descartados, e só links
 * http(s) viram links.
 */

export type Inline =
  | { t: 'texto'; v: string }
  | { t: 'negrito'; c: Inline[] }
  | { t: 'italico'; c: Inline[] }
  | { t: 'codigo'; v: string }
  | { t: 'link'; href: string; c: Inline[] }
  | { t: 'quebra' };

export type ItemLista = { c: Inline[]; nivel: number };

export type Bloco =
  | { t: 'titulo'; nivel: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: 'paragrafo'; c: Inline[] }
  | { t: 'lista'; ordenada: boolean; itens: ItemLista[] }
  | { t: 'citacao'; c: Inline[] }
  | { t: 'codigo'; v: string }
  | { t: 'linha' };

/** Só endereços http(s) viram link (bloqueia javascript:, data: e afins). */
export function hrefSeguro(href: string): string | null {
  try {
    const u = new URL(href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/* ---------- Inline ---------- */

interface Regra {
  re: RegExp;
  montar: (m: RegExpExecArray) => Inline | null;
}

/** Tira pontuação colada no fim de um endereço solto ("…/v5.1.1." ou "(…/v5.1.1)"). */
function cortarUrl(url: string): { url: string; resto: string } {
  let fim = url.length;
  while (fim > 0) {
    const c = url[fim - 1];
    const abre = url.slice(0, fim).split('(').length - 1;
    const fecha = url.slice(0, fim).split(')').length - 1;
    if (/[.,;:!?*_'"\]]/.test(c) || (c === ')' && fecha > abre)) fim--;
    else break;
  }
  return { url: url.slice(0, fim), resto: url.slice(fim) };
}

const REGRAS: Regra[] = [
  { re: /`([^`\n]+)`/, montar: (m) => ({ t: 'codigo', v: m[1] }) },
  {
    re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/,
    montar: (m) => {
      const href = hrefSeguro(m[2]);
      return href ? { t: 'link', href, c: inline(m[1]) } : null;
    },
  },
  { re: /\*\*(?=\S)(.+?)(?<=\S)\*\*/, montar: (m) => ({ t: 'negrito', c: inline(m[1]) }) },
  { re: /__(?=\S)(.+?)(?<=\S)__/, montar: (m) => ({ t: 'negrito', c: inline(m[1]) }) },
  { re: /(?<![\w*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\w*])/, montar: (m) => ({ t: 'italico', c: inline(m[1]) }) },
  { re: /(?<![\w])_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![\w])/, montar: (m) => ({ t: 'italico', c: inline(m[1]) }) },
];

const RE_URL = /https?:\/\/[^\s<>]+/;

function inline(texto: string): Inline[] {
  const saida: Inline[] = [];
  let resto = texto;

  const empurrarTexto = (v: string) => {
    if (!v) return;
    const ult = saida[saida.length - 1];
    if (ult && ult.t === 'texto') ult.v += v;
    else saida.push({ t: 'texto', v });
  };

  while (resto) {
    let melhor: { idx: number; m: RegExpExecArray; regra: Regra | null } | null = null;
    for (const regra of REGRAS) {
      const m = regra.re.exec(resto);
      if (m && (!melhor || m.index < melhor.idx)) melhor = { idx: m.index, m, regra };
    }
    const u = RE_URL.exec(resto);
    if (u && (!melhor || u.index < melhor.idx)) melhor = { idx: u.index, m: u, regra: null };

    if (!melhor) {
      empurrarTexto(resto);
      break;
    }

    empurrarTexto(resto.slice(0, melhor.idx));
    const { m, regra } = melhor;

    if (regra) {
      const no = regra.montar(m);
      if (no) saida.push(no);
      else empurrarTexto(m[0]);
      resto = resto.slice(melhor.idx + m[0].length);
    } else {
      // Endereço solto: vira link (se for seguro) sem levar a pontuação final.
      const { url, resto: sobra } = cortarUrl(m[0]);
      const href = hrefSeguro(url);
      if (href) saida.push({ t: 'link', href, c: [{ t: 'texto', v: url }] });
      else empurrarTexto(url);
      empurrarTexto(sobra);
      resto = resto.slice(melhor.idx + m[0].length);
    }
  }
  return saida;
}

/** Linhas de um mesmo parágrafo viram texto com quebra de linha entre elas. */
function inlineLinhas(linhas: string[]): Inline[] {
  const saida: Inline[] = [];
  linhas.forEach((l, i) => {
    if (i > 0) saida.push({ t: 'quebra' });
    saida.push(...inline(l.trim()));
  });
  return saida;
}

/* ---------- Blocos ---------- */

/** Remove comentários e tags HTML; "<https://…>" vira o próprio endereço. */
function limparHtml(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(https?:\/\/[^\s<>]+)>/g, '$1')
    .replace(/<\/?[A-Za-z][^>\n]*>/g, '');
}

const RE_TITULO = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const RE_LINHA = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_CITACAO = /^\s{0,3}>\s?(.*)$/;
const RE_CERCA = /^\s{0,3}(```+|~~~+)/;

export function interpretarMarkdown(md: string): Bloco[] {
  const linhas = limparHtml(md.replace(/\r\n?/g, '\n')).split('\n');
  const blocos: Bloco[] = [];
  let par: string[] = [];
  let lista: { ordenada: boolean; itens: ItemLista[] } | null = null;
  let citacao: string[] = [];

  const fecharParagrafo = () => {
    if (par.length) blocos.push({ t: 'paragrafo', c: inlineLinhas(par) });
    par = [];
  };
  const fecharLista = () => {
    if (lista) blocos.push({ t: 'lista', ordenada: lista.ordenada, itens: lista.itens });
    lista = null;
  };
  const fecharCitacao = () => {
    if (citacao.length) blocos.push({ t: 'citacao', c: inlineLinhas(citacao) });
    citacao = [];
  };
  const fecharTudo = () => {
    fecharParagrafo();
    fecharLista();
    fecharCitacao();
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    const cerca = RE_CERCA.exec(linha);
    if (cerca) {
      fecharTudo();
      const codigo: string[] = [];
      for (i++; i < linhas.length && !linhas[i].trimStart().startsWith(cerca[1].slice(0, 3)); i++) codigo.push(linhas[i]);
      blocos.push({ t: 'codigo', v: codigo.join('\n') });
      continue;
    }

    if (!linha.trim()) {
      fecharTudo();
      continue;
    }

    const titulo = RE_TITULO.exec(linha);
    if (titulo) {
      fecharTudo();
      blocos.push({ t: 'titulo', nivel: Math.min(titulo[1].length, 4) as 1 | 2 | 3 | 4, c: inline(titulo[2]) });
      continue;
    }

    if (RE_LINHA.test(linha)) {
      fecharTudo();
      blocos.push({ t: 'linha' });
      continue;
    }

    const cit = RE_CITACAO.exec(linha);
    if (cit) {
      fecharParagrafo();
      fecharLista();
      citacao.push(cit[1]);
      continue;
    }

    const item = RE_ITEM.exec(linha);
    if (item) {
      fecharParagrafo();
      fecharCitacao();
      const ordenada = /\d/.test(item[2]);
      if (lista && lista.ordenada !== ordenada && item[1].length === 0) fecharLista();
      lista ??= { ordenada, itens: [] };
      lista.itens.push({ c: inline(item[3].trim()), nivel: Math.min(2, Math.floor(item[1].replace(/\t/g, '  ').length / 2)) });
      continue;
    }

    // Linha recuada logo após um item continua o texto dele.
    if (lista && /^\s+\S/.test(linha)) {
      const ult = lista.itens[lista.itens.length - 1];
      ult.c.push({ t: 'quebra' }, ...inline(linha.trim()));
      continue;
    }

    fecharLista();
    fecharCitacao();
    par.push(linha);
  }
  fecharTudo();
  return blocos;
}
