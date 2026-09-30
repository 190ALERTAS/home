import { readJSON, writeJSON } from '../../lib/storage';

/**
 * Notas de atualização: as releases públicas do repositório no GitHub.
 * A API aceita consulta sem login e responde com CORS aberto (Access-Control-Allow-Origin: *), então
 * dá para pedir direto do navegador. O limite sem login é de 60 consultas por hora por rede, por isso
 * o último resultado fica guardado neste aparelho (localStorage) e serve também sem internet.
 */

export const REPO = '190ALERTAS/home';
export const URL_PAGINA_RELEASES = `https://github.com/${REPO}/releases`;
const URL_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;

export const K_RELEASES = '190a:releases';
/** Enquanto o resultado guardado for mais novo que isto, abrir o painel não consulta o GitHub. */
export const VALIDADE_MS = 60 * 60 * 1000;
const PRAZO_MS = 15_000;
/** Corpo maior que isto é cortado (o texto completo continua no GitHub). */
const MAX_CORPO = 12_000;

export interface Publicacao {
  /** "v5.1.1" */
  tag: string;
  titulo: string;
  /** Data e hora de publicação (ISO) ou null se o GitHub não informou. */
  data: string | null;
  /** Markdown original (sem HTML confiável: passa pelo interpretador seguro). */
  corpo: string;
  cortado: boolean;
  url: string;
  preLancamento: boolean;
}

export interface CacheReleases {
  /** Quando foi guardado (ms desde 1970). */
  em: number;
  itens: Publicacao[];
}

export type MotivoFalha = 'rede' | 'limite' | 'servico';

export class FalhaReleases extends Error {
  constructor(public motivo: MotivoFalha) {
    super(motivo);
    this.name = 'FalhaReleases';
  }
}

/* ---------- Interpretação da resposta ---------- */

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');

/** "v5.1.1" → [5, 1, 1]; null se a tag não for numérica. */
export function versaoDaTag(tag: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(tag.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/** A tag é a versão informada? ("v5.1.2" e "5.1.2" contam igual; sem versão numérica, nunca.) */
export function mesmaVersao(tag: string, versao: string): boolean {
  const a = versaoDaTag(tag);
  const b = versaoDaTag(versao);
  return !!a && !!b && a.every((n, i) => n === b[i]);
}

/** Mais nova primeiro: pela versão da tag; sem versão, pela data. */
function maisNovaPrimeiro(a: Publicacao, b: Publicacao): number {
  const va = versaoDaTag(a.tag);
  const vb = versaoDaTag(b.tag);
  if (va && vb) {
    for (let i = 0; i < 3; i++) if (va[i] !== vb[i]) return vb[i] - va[i];
    return 0;
  }
  return (b.data ? Date.parse(b.data) : 0) - (a.data ? Date.parse(a.data) : 0);
}

/** Aceita só o que a API deveria devolver e ignora o resto (nunca lança). */
export function interpretarReleases(json: unknown): Publicacao[] {
  if (!Array.isArray(json)) return [];
  const itens: Publicacao[] = [];
  for (const r of json) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const tag = texto(o.tag_name).trim();
    if (!tag || o.draft === true) continue;
    const corpo = texto(o.body).replace(/\r\n?/g, '\n').trim();
    const publicado = texto(o.published_at) || texto(o.created_at);
    const url = texto(o.html_url);
    itens.push({
      tag,
      titulo: texto(o.name).trim() || tag,
      data: publicado && !Number.isNaN(Date.parse(publicado)) ? publicado : null,
      corpo: corpo.slice(0, MAX_CORPO),
      cortado: corpo.length > MAX_CORPO,
      // Só endereços do próprio GitHub: qualquer outro cai na página de releases.
      url: url.startsWith('https://github.com/') ? url : URL_PAGINA_RELEASES,
      preLancamento: o.prerelease === true,
    });
  }
  return itens.sort(maisNovaPrimeiro);
}

/* ---------- Cache no aparelho ---------- */

export function lerCache(): CacheReleases | null {
  const c = readJSON<unknown>(K_RELEASES, null);
  if (!c || typeof c !== 'object') return null;
  const { em, itens } = c as Partial<CacheReleases>;
  if (typeof em !== 'number' || !Array.isArray(itens)) return null;
  // O localStorage pode ter sido mexido: só volta o que ainda tem o formato esperado.
  const validos = itens.filter(
    (p): p is Publicacao =>
      !!p &&
      typeof p.tag === 'string' &&
      typeof p.titulo === 'string' &&
      typeof p.corpo === 'string' &&
      p.corpo.length <= MAX_CORPO &&
      typeof p.url === 'string' &&
      p.url.startsWith('https://github.com/') &&
      (p.data === null || typeof p.data === 'string'),
  );
  return { em, itens: validos };
}

export function guardarCache(itens: Publicacao[]): CacheReleases {
  const c = { em: Date.now(), itens };
  writeJSON(K_RELEASES, c);
  return c;
}

/* ---------- Consulta ---------- */

export async function buscarReleases(sinal?: AbortSignal): Promise<Publicacao[]> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  sinal?.addEventListener('abort', aoAbortar);
  const prazo = window.setTimeout(() => ctrl.abort(), PRAZO_MS);
  try {
    const resp = await fetch(URL_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: ctrl.signal,
    });
    if (resp.status === 403 || resp.status === 429) throw new FalhaReleases('limite');
    if (!resp.ok) throw new FalhaReleases('servico');
    const json: unknown = await resp.json().catch(() => null);
    if (!Array.isArray(json)) throw new FalhaReleases('servico');
    return interpretarReleases(json);
  } catch (e) {
    if (e instanceof FalhaReleases) throw e;
    // Sem rede, DNS, bloqueio ou prazo esgotado.
    throw new FalhaReleases('rede');
  } finally {
    window.clearTimeout(prazo);
    sinal?.removeEventListener('abort', aoAbortar);
  }
}
