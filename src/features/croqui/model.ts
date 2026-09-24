/**
 * Modelo do Croqui.
 *
 * Coordenadas em "unidades de palco": no modo mapa, 1 unidade = 1 pixel do mapa
 * capturado (na tela); `metrosPorUnidade` permite desenhar os veículos em escala real.
 */

export type TipoVeiculo =
  | 'automovel'
  | 'caminhonete'
  | 'viatura'
  | 'onibus'
  | 'caminhao'
  | 'carreta'
  | 'moto'
  | 'bicicleta'
  | 'carroca';

export type EstadoVeiculo = 'normal' | 'capotado' | 'tombado';

export type TipoSimbolo =
  | 'impacto'
  | 'pedestre'
  | 'animal'
  | 'semaforo'
  | 'pare'
  | 'preferencia'
  | 'poste'
  | 'arvore'
  | 'cone'
  | 'faixa'
  | 'lombada'
  | 'muro'
  | 'fragmentos';

export type TipoVia = 'reta' | 'cruzamento' | 'entroncamento' | 'rotula' | 'curva';

export type EstiloLinha = 'trajetoria' | 'pos-impacto' | 'frenagem' | 'medida';

interface Pontual {
  id: string;
  x: number;
  y: number;
  /** graus, sentido horário; 0 = frente apontando para a direita */
  rot: number;
  /** 1 = tamanho real */
  escala: number;
}

export interface VeiculoEl extends Pontual {
  kind: 'veiculo';
  tipo: TipoVeiculo;
  estado: EstadoVeiculo;
  cor: string;
  rotulo: string;
  descricao: string;
}

export interface SimboloEl extends Pontual {
  kind: 'simbolo';
  tipo: TipoSimbolo;
  rotulo: string;
}

export interface ViaEl extends Pontual {
  kind: 'via';
  tipo: TipoVia;
  /** comprimento em metros (vias retas e braços dos cruzamentos) */
  comprimento: number;
  faixas: 2 | 4;
}

export interface TextoEl extends Pontual {
  kind: 'texto';
  texto: string;
  cor: string;
  fundo: boolean;
}

export interface LinhaEl {
  id: string;
  kind: 'linha';
  estilo: EstiloLinha;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** ponto de controle da curva (null = reta) */
  cx: number | null;
  cy: number | null;
  cor: string;
}

export type Elemento = VeiculoEl | SimboloEl | ViaEl | TextoEl | LinhaEl;
export type ElementoPontual = VeiculoEl | SimboloEl | ViaEl | TextoEl;

export type Fundo =
  | { tipo: 'mapa'; camada: 'ruas' | 'satelite'; lat: number; lng: number; zoom: number }
  | { tipo: 'branco'; grade: boolean };

export interface CroquiInfo {
  titulo: string;
  data: string;
  hora: string;
  local: string;
  observacoes: string;
}

export interface CroquiDoc {
  version: 1;
  largura: number;
  altura: number;
  metrosPorUnidade: number;
  fundo: Fundo;
  elementos: Elemento[];
  info: CroquiInfo;
  atualizadoEm: string;
}

/* ---------- Catálogo ---------- */

export interface ItemCatalogo<T extends string> {
  tipo: T;
  nome: string;
  /** dimensões reais em metros (comprimento × largura, vista de cima) */
  w: number;
  h: number;
}

export const VEICULOS: ItemCatalogo<TipoVeiculo>[] = [
  { tipo: 'automovel', nome: 'Automóvel', w: 4.5, h: 1.8 },
  { tipo: 'caminhonete', nome: 'Caminhonete / van', w: 5.3, h: 1.95 },
  { tipo: 'viatura', nome: 'Viatura', w: 4.7, h: 1.8 },
  { tipo: 'moto', nome: 'Motocicleta', w: 2.1, h: 1.1 },
  { tipo: 'bicicleta', nome: 'Bicicleta', w: 1.8, h: 1.0 },
  { tipo: 'onibus', nome: 'Ônibus', w: 12, h: 2.6 },
  { tipo: 'caminhao', nome: 'Caminhão', w: 9, h: 2.5 },
  { tipo: 'carreta', nome: 'Carreta', w: 16, h: 2.6 },
  { tipo: 'carroca', nome: 'Carroça', w: 4.2, h: 1.6 },
];

export const SIMBOLOS: ItemCatalogo<TipoSimbolo>[] = [
  { tipo: 'impacto', nome: 'Ponto de impacto', w: 1.8, h: 1.8 },
  { tipo: 'pedestre', nome: 'Pedestre', w: 1.2, h: 1.6 },
  { tipo: 'animal', nome: 'Animal', w: 2.2, h: 1.4 },
  { tipo: 'fragmentos', nome: 'Fragmentos / óleo', w: 2.4, h: 1.6 },
  { tipo: 'semaforo', nome: 'Semáforo', w: 0.9, h: 1.8 },
  { tipo: 'pare', nome: 'Placa PARE', w: 1.2, h: 1.2 },
  { tipo: 'preferencia', nome: 'Dê a preferência', w: 1.2, h: 1.1 },
  { tipo: 'faixa', nome: 'Faixa de pedestres', w: 3, h: 7 },
  { tipo: 'lombada', nome: 'Lombada', w: 1.2, h: 7 },
  { tipo: 'poste', nome: 'Poste', w: 0.7, h: 0.7 },
  { tipo: 'arvore', nome: 'Árvore', w: 3.2, h: 3.2 },
  { tipo: 'cone', nome: 'Cone', w: 0.7, h: 0.7 },
  { tipo: 'muro', nome: 'Muro / obstáculo', w: 5, h: 0.5 },
];

export const VIAS: { tipo: TipoVia; nome: string }[] = [
  { tipo: 'reta', nome: 'Via reta' },
  { tipo: 'cruzamento', nome: 'Cruzamento' },
  { tipo: 'entroncamento', nome: 'Entroncamento (T)' },
  { tipo: 'rotula', nome: 'Rótula' },
  { tipo: 'curva', nome: 'Curva' },
];

export const LINHAS: { estilo: EstiloLinha; nome: string; desc: string }[] = [
  { estilo: 'trajetoria', nome: 'Trajetória', desc: 'Sentido do veículo antes do impacto' },
  { estilo: 'pos-impacto', nome: 'Pós-impacto', desc: 'Deslocamento após a colisão (tracejada)' },
  { estilo: 'frenagem', nome: 'Frenagem', desc: 'Marcas de pneu no asfalto' },
  { estilo: 'medida', nome: 'Medida', desc: 'Distância em metros' },
];

/** Cores de identificação: V1 vermelho, V2 azul, V3 amarelo... */
export const CORES_VEICULO = ['#e53935', '#1e6fe5', '#f2c200', '#2e9d4a', '#8e44d6', '#f57c00', '#ffffff', '#222222'];

export const LARGURA_FAIXA = 3.5; // metros

export function dimensoesVeiculo(tipo: TipoVeiculo, estado: EstadoVeiculo): { w: number; h: number } {
  const item = VEICULOS.find((v) => v.tipo === tipo)!;
  // Tombado é desenhado de lado: altura do veículo no lugar da largura.
  if (estado === 'tombado') {
    const altura = tipo === 'onibus' || tipo === 'caminhao' || tipo === 'carreta' ? 3.2 : tipo === 'caminhonete' ? 1.9 : 1.5;
    return { w: item.w, h: altura };
  }
  return { w: item.w, h: item.h };
}

export function dimensoesSimbolo(tipo: TipoSimbolo): { w: number; h: number } {
  const item = SIMBOLOS.find((s) => s.tipo === tipo)!;
  return { w: item.w, h: item.h };
}

export function dimensoesVia(el: Pick<ViaEl, 'tipo' | 'comprimento' | 'faixas'>): { w: number; h: number } {
  const largura = el.faixas * LARGURA_FAIXA;
  switch (el.tipo) {
    case 'reta':
      return { w: el.comprimento, h: largura };
    case 'cruzamento':
    case 'rotula':
      return { w: el.comprimento, h: el.comprimento };
    case 'entroncamento':
      return { w: el.comprimento, h: el.comprimento / 2 + largura / 2 };
    case 'curva':
      return { w: el.comprimento / 2 + largura / 2, h: el.comprimento / 2 + largura / 2 };
  }
}

/** Tamanho (em metros) de um elemento pontual, sem aplicar a escala do usuário. */
export function dimensoes(el: ElementoPontual): { w: number; h: number } {
  switch (el.kind) {
    case 'veiculo':
      return dimensoesVeiculo(el.tipo, el.estado);
    case 'simbolo':
      return dimensoesSimbolo(el.tipo);
    case 'via':
      return dimensoesVia(el);
    case 'texto': {
      const linhas = el.texto.split('\n');
      const maior = Math.max(1, ...linhas.map((l) => l.length));
      return { w: Math.max(1.5, maior * 0.62), h: linhas.length * 1.25 + 0.4 };
    }
  }
}

export function infoVazia(): CroquiInfo {
  return { titulo: 'Acidente de trânsito', data: '', hora: '', local: '', observacoes: '' };
}
