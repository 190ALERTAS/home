import { formatDateBR } from '../../lib/date';
import { CAMADAS } from './mapa';
import { LINHAS, SIMBOLOS, VEICULOS, type CroquiDoc, type LinhaEl, type SimboloEl, type VeiculoEl } from './model';

const NS = 'http://www.w3.org/2000/svg';

function carregar(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem'));
    img.src = url;
  });
}

/** Serializa as camadas vetoriais do editor em uma imagem SVG autônoma. */
async function imagemVetorial(svg: SVGSVGElement, doc: CroquiDoc, incluirFundo: boolean, largura: number, altura: number) {
  const novo = document.createElementNS(NS, 'svg');
  novo.setAttribute('xmlns', NS);
  novo.setAttribute('viewBox', `0 0 ${doc.largura} ${doc.altura}`);
  novo.setAttribute('width', String(largura));
  novo.setAttribute('height', String(altura));
  if (incluirFundo) {
    const fundo = svg.querySelector('[data-layer="fundo"]');
    if (fundo) novo.appendChild(fundo.cloneNode(true));
  }
  const camada = svg.querySelector('[data-layer="elementos"]');
  if (camada) novo.appendChild(camada.cloneNode(true));
  const texto = new XMLSerializer().serializeToString(novo);
  const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    return await carregar(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function quebrarTexto(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split('\n')) {
    const palavras = paragrafo.split(/\s+/);
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > largura && atual) {
        linhas.push(atual);
        atual = p;
      } else atual = teste;
    }
    linhas.push(atual);
  }
  return linhas;
}

function escalaGrafica(mpu: number, pxPorUnidade: number, alvoPx: number): { metros: number; px: number } {
  const opcoes = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  const pxPorMetro = pxPorUnidade / mpu;
  let melhor = opcoes[0];
  for (const m of opcoes) if (m * pxPorMetro <= alvoPx) melhor = m;
  return { metros: melhor, px: melhor * pxPorMetro };
}

export async function exportarCroqui(svg: SVGSVGElement, doc: CroquiDoc, fundo: Blob | null): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load('800 40px "Barlow Condensed"'),
      document.fonts.load('600 20px "Barlow"'),
      document.fonts.load('400 20px "Barlow"'),
    ]);
  } catch {
    /* segue com a fonte padrão */
  }

  // Área do desenho
  const R = Math.min(2400 / doc.largura, Math.max(2, 1400 / doc.largura));
  const DW = Math.round(doc.largura * R);
  const DH = Math.round(doc.altura * R);
  const u = DW / 1000; // unidade de layout proporcional
  const P = Math.round(36 * u);
  const W = DW + P * 2;
  const cabecalho = Math.round(150 * u);

  // Itens da legenda
  const veiculos = doc.elementos.filter((e): e is VeiculoEl => e.kind === 'veiculo');
  const simbolos = [...new Map(doc.elementos.filter((e): e is SimboloEl => e.kind === 'simbolo').map((s) => [s.tipo, s])).values()];
  const linhas = [...new Map(doc.elementos.filter((e): e is LinhaEl => e.kind === 'linha').map((l) => [l.estilo, l])).values()];

  const medir = document.createElement('canvas').getContext('2d')!;
  medir.font = `400 ${Math.round(26 * u)}px Barlow, Arial, sans-serif`;
  const obs = doc.info.observacoes.trim() ? quebrarTexto(medir, doc.info.observacoes.trim(), DW) : [];
  const linhaAlt = Math.round(40 * u);
  const itensLegenda = veiculos.length + simbolos.length + linhas.length;
  const colunas = DW > 900 ? 2 : 1;
  const legendaAlt = itensLegenda ? Math.round(56 * u) + Math.ceil(itensLegenda / colunas) * linhaAlt : 0;
  const obsAlt = obs.length ? Math.round(56 * u) + obs.length * Math.round(34 * u) : 0;
  const rodape = Math.round(70 * u);
  const H = cabecalho + P + DH + P + legendaAlt + (legendaAlt ? P / 2 : 0) + obsAlt + rodape;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = Math.round(H);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Cabeçalho
  ctx.fillStyle = '#0c0c0f';
  ctx.fillRect(0, 0, W, cabecalho);
  ctx.fillStyle = '#e5162c';
  ctx.fillRect(0, cabecalho - Math.round(8 * u), W, Math.round(8 * u));
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${Math.round(54 * u)}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
  const titulo = `CROQUI — ${(doc.info.titulo || 'Acidente de trânsito').toLocaleUpperCase('pt-BR')}`;
  ctx.fillText(titulo, P, Math.round(70 * u), W - P * 2 - 200 * u);
  ctx.font = `500 ${Math.round(26 * u)}px Barlow, Arial, sans-serif`;
  ctx.fillStyle = '#c9c9d1';
  const quando = [doc.info.data && formatDateBR(doc.info.data), doc.info.hora].filter(Boolean).join(' às ');
  const sub = [quando, doc.info.local].filter(Boolean).join('  ·  ');
  if (sub) ctx.fillText(sub, P, Math.round(112 * u), W - P * 2);
  ctx.textAlign = 'right';
  ctx.font = `800 ${Math.round(30 * u)}px "Barlow Condensed", Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ALERTAS', W - P, Math.round(68 * u));
  const larguraAlertas = ctx.measureText('ALERTAS').width;
  ctx.fillStyle = '#ff2d44';
  ctx.fillText('190', W - P - larguraAlertas - 8 * u, Math.round(68 * u));
  ctx.textAlign = 'left';

  // Desenho
  const dy = cabecalho + P;
  if (doc.fundo.tipo === 'mapa' && fundo) {
    const url = URL.createObjectURL(fundo);
    try {
      const img = await carregar(url);
      ctx.drawImage(img, P, dy, DW, DH);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const vetor = await imagemVetorial(svg, doc, doc.fundo.tipo === 'branco', DW, DH);
  ctx.drawImage(vetor, P, dy, DW, DH);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(2, 2 * u);
  ctx.strokeRect(P, dy, DW, DH);

  // Norte (só faz sentido sobre o mapa, que é sempre orientado ao norte)
  const nr = 34 * u;
  if (doc.fundo.tipo === 'mapa') {
  const nx = P + DW - nr - 16 * u;
  const ny = dy + nr + 16 * u;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(nx, ny, nr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.fillStyle = '#e5162c';
  ctx.beginPath();
  ctx.moveTo(nx, ny - nr * 0.78);
  ctx.lineTo(nx + nr * 0.3, ny + nr * 0.1);
  ctx.lineTo(nx, ny - nr * 0.05);
  ctx.lineTo(nx - nr * 0.3, ny + nr * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.font = `800 ${Math.round(24 * u)}px "Barlow Condensed", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + nr * 0.72);
  ctx.textAlign = 'left';
  }

  // Escala gráfica
  const esc = escalaGrafica(doc.metrosPorUnidade, R, DW * 0.22);
  const bx = P + 18 * u;
  const by = dy + DH - 34 * u;
  const bh = 10 * u;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(bx - 10 * u, by - 34 * u, esc.px + 20 * u + 70 * u, 58 * u);
  const partes = 4;
  for (let i = 0; i < partes; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#111111';
    ctx.fillRect(bx + (esc.px / partes) * i, by, esc.px / partes, bh);
  }
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5 * u;
  ctx.strokeRect(bx, by, esc.px, bh);
  ctx.fillStyle = '#111111';
  ctx.font = `600 ${Math.round(20 * u)}px Barlow, Arial, sans-serif`;
  ctx.fillText('0', bx - 4 * u, by - 8 * u);
  ctx.fillText(`${esc.metros} m`, bx + esc.px - 12 * u, by - 8 * u);

  // Legenda
  let y = dy + DH + P;
  const titulo2 = (t: string) => {
    ctx.fillStyle = '#e5162c';
    ctx.fillRect(P, y + 6 * u, 6 * u, 26 * u);
    ctx.fillStyle = '#111111';
    ctx.font = `800 ${Math.round(28 * u)}px "Barlow Condensed", Arial, sans-serif`;
    ctx.fillText(t, P + 16 * u, y + 30 * u);
    y += 56 * u;
  };
  if (itensLegenda) {
    titulo2('LEGENDA');
    const colW = DW / colunas;
    const itens: ((x: number, yy: number) => void)[] = [];
    for (const v of veiculos) {
      itens.push((x, yy) => {
        ctx.fillStyle = v.cor;
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2 * u;
        retanguloArredondado(ctx, x, yy - 22 * u, 44 * u, 26 * u, 5 * u);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#111111';
        ctx.font = `700 ${Math.round(24 * u)}px Barlow, Arial, sans-serif`;
        const nome = VEICULOS.find((x2) => x2.tipo === v.tipo)?.nome ?? 'Veículo';
        const estado = v.estado === 'capotado' ? ' (capotado)' : v.estado === 'tombado' ? ' (tombado)' : '';
        ctx.fillText(`${v.rotulo || '—'}  ${v.descricao || nome}${estado}`, x + 58 * u, yy, colW - 70 * u);
      });
    }
    for (const s of simbolos) {
      itens.push((x, yy) => {
        ctx.fillStyle = s.tipo === 'impacto' ? '#ffd400' : '#9e9e9e';
        ctx.strokeStyle = s.tipo === 'impacto' ? '#d50000' : '#111111';
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.arc(x + 22 * u, yy - 9 * u, 12 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#111111';
        ctx.font = `500 ${Math.round(24 * u)}px Barlow, Arial, sans-serif`;
        ctx.fillText(SIMBOLOS.find((x2) => x2.tipo === s.tipo)?.nome ?? '', x + 58 * u, yy, colW - 70 * u);
      });
    }
    for (const l of linhas) {
      itens.push((x, yy) => {
        ctx.strokeStyle = l.cor;
        ctx.lineWidth = 4 * u;
        ctx.setLineDash(l.estilo === 'pos-impacto' || l.estilo === 'frenagem' ? [8 * u, 5 * u] : []);
        ctx.beginPath();
        ctx.moveTo(x, yy - 9 * u);
        ctx.lineTo(x + 44 * u, yy - 9 * u);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#111111';
        ctx.font = `500 ${Math.round(24 * u)}px Barlow, Arial, sans-serif`;
        ctx.fillText(LINHAS.find((x2) => x2.estilo === l.estilo)?.nome ?? '', x + 58 * u, yy, colW - 70 * u);
      });
    }
    itens.forEach((desenhar, i) => {
      const col = i % colunas;
      const lin = Math.floor(i / colunas);
      desenhar(P + col * colW, y + lin * linhaAlt + 24 * u);
    });
    y += Math.ceil(itens.length / colunas) * linhaAlt + P / 2;
  }

  if (obs.length) {
    titulo2('OBSERVAÇÕES');
    ctx.fillStyle = '#222222';
    ctx.font = `400 ${Math.round(26 * u)}px Barlow, Arial, sans-serif`;
    obs.forEach((l, i) => ctx.fillText(l, P, y + i * 34 * u + 4 * u));
    y += obs.length * 34 * u;
  }

  // Rodapé
  ctx.fillStyle = '#f2f2f4';
  ctx.fillRect(0, H - rodape, W, rodape);
  ctx.fillStyle = '#6b6b75';
  ctx.font = `500 ${Math.round(19 * u)}px Barlow, Arial, sans-serif`;
  const agora = new Date();
  const credito = doc.fundo.tipo === 'mapa' ? ` · ${CAMADAS[doc.fundo.camada].creditoCurto}` : '';
  ctx.fillText(
    `Gerado com o 190 ALERTAS em ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Croqui ilustrativo${credito}`,
    P,
    H - rodape / 2 + 7 * u,
    W - P * 2,
  );

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}
