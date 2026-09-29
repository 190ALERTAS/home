/** Camadas de mapa, captura em alta resolução e busca de endereços. */

export type Camada = 'ruas' | 'satelite';

export const CAMADAS: Record<Camada, { url: string; atribuicao: string; maxNativo: number; creditoCurto: string }> = {
  ruas: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativo: 19,
    creditoCurto: 'Mapa © colaboradores do OpenStreetMap',
  },
  satelite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
    maxNativo: 19,
    creditoCurto: 'Imagens © Esri, Maxar, Earthstar Geographics',
  },
};

export const RAIO_TERRA = 6378137;

/** Metros por pixel (CSS) na latitude e zoom informados (Web Mercator, tiles de 256px). */
export function metrosPorPixel(lat: number, zoom: number): number {
  return (2 * Math.PI * RAIO_TERRA * Math.cos((lat * Math.PI) / 180)) / (256 * 2 ** zoom);
}

function urlTile(camada: Camada, z: number, x: number, y: number): string {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  return CAMADAS[camada].url.replace('{z}', String(z)).replace('{x}', String(xx)).replace('{y}', String(y));
}

function carregarImagem(url: string, timeoutMs = 15000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('erro'));
    };
    img.src = url;
  });
}

export interface Captura {
  blob: Blob;
  /** tamanho do palco em unidades (px CSS do mapa na tela) */
  largura: number;
  altura: number;
  metrosPorUnidade: number;
  falhas: number;
}

/**
 * Monta a imagem da área visível do mapa em resolução dobrada, costurando os
 * tiles do nível de zoom seguinte (nítido ao aproximar no editor).
 *
 * @param origem canto superior esquerdo da vista em pixels do mundo no zoom `zoom`
 */
export async function capturarArea(opts: {
  camada: Camada;
  zoom: number;
  origem: { x: number; y: number };
  largura: number;
  altura: number;
  lat: number;
  resolucao?: number;
  onProgresso?: (feitos: number, total: number) => void;
}): Promise<Captura> {
  const { camada, zoom, origem, largura, altura, lat } = opts;
  const R = opts.resolucao ?? 2;
  const zTile = Math.min(zoom + 1, CAMADAS[camada].maxNativo);
  const fator = 2 ** (zTile - zoom); // px do nível zTile por px da vista
  const escala = R / fator; // px de saída por px do nível zTile

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(largura * R);
  canvas.height = Math.round(altura * R);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.fillStyle = '#d9d9d9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x0 = origem.x * fator;
  const y0 = origem.y * fator;
  const x1 = (origem.x + largura) * fator;
  const y1 = (origem.y + altura) * fator;
  const tx0 = Math.floor(x0 / 256);
  const ty0 = Math.floor(y0 / 256);
  const tx1 = Math.floor((x1 - 1) / 256);
  const ty1 = Math.floor((y1 - 1) / 256);
  const maxY = 2 ** zTile - 1;

  const tarefas: { tx: number; ty: number }[] = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (ty >= 0 && ty <= maxY) tarefas.push({ tx, ty });

  let feitos = 0;
  let falhas = 0;
  const tam = 256 * escala;
  // Poucas requisições simultâneas, para respeitar os servidores de mapa.
  const fila = [...tarefas];
  const trabalhador = async () => {
    for (let t = fila.shift(); t; t = fila.shift()) {
      try {
        const img = await carregarImagem(urlTile(camada, zTile, t.tx, t.ty));
        ctx.drawImage(img, (t.tx * 256 - x0) * escala, (t.ty * 256 - y0) * escala, tam + 0.5, tam + 0.5);
      } catch {
        falhas++;
      }
      feitos++;
      opts.onProgresso?.(feitos, tarefas.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, tarefas.length) }, trabalhador));

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', 0.9),
  );
  return { blob, largura, altura, metrosPorUnidade: metrosPorPixel(lat, zoom), falhas };
}

/* ---------- Busca de endereços (Nominatim / OpenStreetMap) ---------- */

export interface ResultadoBusca {
  nome: string;
  lat: number;
  lng: number;
}

export async function buscarEndereco(q: string, perto?: { lat: number; lng: number }): Promise<ResultadoBusca[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    countrycodes: 'br',
    limit: '6',
    'accept-language': 'pt-BR',
  });
  if (perto) {
    const d = 0.6;
    params.set('viewbox', `${perto.lng - d},${perto.lat + d},${perto.lng + d},${perto.lat - d}`);
  }
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const dados = (await r.json()) as { display_name: string; lat: string; lon: string }[];
  return dados.map((d) => ({ nome: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

/** Endereço aproximado de um ponto, para preencher o campo "Local". */
export async function enderecoDoPonto(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lng), zoom: '18', 'accept-language': 'pt-BR' });
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const d = (await r.json()) as { address?: Record<string, string> };
    const a = d.address ?? {};
    const rua = a.road ?? a.pedestrian ?? a.highway ?? '';
    const bairro = a.suburb ?? a.neighbourhood ?? a.quarter ?? '';
    const cidade = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
    const partes = [rua && (a.house_number ? `${rua}, ${a.house_number}` : rua), bairro, cidade].filter(Boolean);
    return partes.length ? partes.join(' - ') : null;
  } catch {
    return null;
  }
}
