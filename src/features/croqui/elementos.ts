import { uid } from '../../lib/id';
import {
  CORES_VEICULO,
  dimensoes,
  type Elemento,
  type ElementoPontual,
  type EstiloLinha,
  type LinhaEl,
  type SimboloEl,
  type TextoEl,
  type TipoSimbolo,
  type TipoVeiculo,
  type TipoVia,
  type VeiculoEl,
  type ViaEl,
} from './model';

/** Próximo rótulo livre (V1, V2...) e sua cor de identificação. */
export function proximoVeiculo(elementos: Elemento[]): { rotulo: string; cor: string } {
  const usados = new Set(elementos.filter((e): e is VeiculoEl => e.kind === 'veiculo').map((e) => e.rotulo.toUpperCase()));
  let n = 1;
  while (usados.has(`V${n}`)) n++;
  return { rotulo: `V${n}`, cor: CORES_VEICULO[(n - 1) % 6] };
}

export function novoVeiculo(tipo: TipoVeiculo, x: number, y: number, elementos: Elemento[]): VeiculoEl {
  const { rotulo, cor } = proximoVeiculo(elementos);
  return { id: uid(), kind: 'veiculo', tipo, estado: 'normal', x, y, rot: 0, escala: 1, cor, rotulo, descricao: '' };
}

export function novoSimbolo(tipo: TipoSimbolo, x: number, y: number): SimboloEl {
  const rot = tipo === 'faixa' || tipo === 'lombada' ? 0 : 0;
  return { id: uid(), kind: 'simbolo', tipo, x, y, rot, escala: 1, rotulo: '' };
}

export function novaVia(tipo: TipoVia, x: number, y: number): ViaEl {
  const comprimento = tipo === 'rotula' ? 24 : 30;
  return { id: uid(), kind: 'via', tipo, x, y, rot: 0, escala: 1, comprimento, faixas: 2 };
}

export function novoTexto(x: number, y: number, texto = 'Texto'): TextoEl {
  return { id: uid(), kind: 'texto', texto, x, y, rot: 0, escala: 1, cor: '#111111', fundo: true };
}

/** Nova linha centrada em (x, y), com o comprimento indicado em metros. */
export function novaLinha(estilo: EstiloLinha, x: number, y: number, mpu: number, metros = 8): LinhaEl {
  const meio = metros / 2 / mpu;
  const cor = estilo === 'medida' ? '#1e5bff' : estilo === 'frenagem' ? '#222222' : '#111111';
  return { id: uid(), kind: 'linha', estilo, x1: x - meio, y1: y, x2: x + meio, y2: y, cx: null, cy: null, cor };
}

export function duplicar(el: Elemento, elementos: Elemento[], mpu: number): Elemento {
  const d = 2 / mpu; // desloca 2 m
  if (el.kind === 'linha') {
    return {
      ...el,
      id: uid(),
      x1: el.x1 + d,
      y1: el.y1 + d,
      x2: el.x2 + d,
      y2: el.y2 + d,
      cx: el.cx == null ? null : el.cx + d,
      cy: el.cy == null ? null : el.cy + d,
    };
  }
  const copia = { ...el, id: uid(), x: el.x + d, y: el.y + d } as ElementoPontual;
  if (copia.kind === 'veiculo') {
    const { rotulo, cor } = proximoVeiculo(elementos);
    copia.rotulo = rotulo;
    copia.cor = cor;
    copia.descricao = '';
  }
  return copia;
}

/** Tamanho do elemento em unidades de palco (com a escala do usuário). */
export function tamanhoPalco(el: ElementoPontual, mpu: number): { w: number; h: number } {
  const { w, h } = dimensoes(el);
  const k = el.escala / mpu;
  return { w: w * k, h: h * k };
}

/** Ordem de desenho: vias sempre por baixo, depois o restante na ordem de inserção. */
export function ordemDesenho(elementos: Elemento[]): Elemento[] {
  return [...elementos.filter((e) => e.kind === 'via'), ...elementos.filter((e) => e.kind !== 'via')];
}

export function nomeElemento(el: Elemento): string {
  switch (el.kind) {
    case 'veiculo':
      return el.rotulo || 'Veículo';
    case 'simbolo':
      return (
        {
          impacto: 'Ponto de impacto',
          pedestre: 'Pedestre',
          animal: 'Animal',
          semaforo: 'Semáforo',
          pare: 'Placa PARE',
          preferencia: 'Dê a preferência',
          poste: 'Poste',
          arvore: 'Árvore',
          cone: 'Cone',
          faixa: 'Faixa de pedestres',
          lombada: 'Lombada',
          muro: 'Muro / obstáculo',
          fragmentos: 'Fragmentos',
        } as Record<TipoSimbolo, string>
      )[el.tipo];
    case 'via':
      return { reta: 'Via reta', cruzamento: 'Cruzamento', entroncamento: 'Entroncamento', rotula: 'Rótula', curva: 'Curva' }[el.tipo];
    case 'texto':
      return 'Texto';
    case 'linha':
      return { trajetoria: 'Trajetória', 'pos-impacto': 'Pós-impacto', frenagem: 'Frenagem', medida: 'Medida' }[el.estilo];
  }
}
