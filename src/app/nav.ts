import {
  CalendarDays,
  Dumbbell,
  FileText,
  House,
  MessageSquareText,
  PencilRuler,
  ScrollText,
  CarFront,
  type LucideIcon,
} from 'lucide-react';
import type { RouteId } from '../lib/router';

export interface NavEntry {
  id: RouteId;
  label: string;
  long: string;
  desc: string;
  icon: LucideIcon;
}

export const NAV: Record<RouteId, NavEntry> = {
  inicio: { id: 'inicio', label: 'Início', long: 'Início', desc: 'Página inicial', icon: House },
  release: {
    id: 'release',
    label: 'Release',
    long: 'Release',
    desc: 'Release de ocorrência no padrão',
    icon: FileText,
  },
  veiculos: {
    id: 'veiculos',
    label: 'Alerta',
    long: 'Alerta de veículo',
    desc: 'Furto e roubo de veículos em segundos',
    icon: CarFront,
  },
  escala: {
    id: 'escala',
    label: 'Escala',
    long: 'Minha escala',
    desc: 'Turnos, horas e extras do mês',
    icon: CalendarDays,
  },
  croqui: {
    id: 'croqui',
    label: 'Croqui',
    long: 'Croqui digital',
    desc: 'Croqui de acidente sobre mapa ou em branco',
    icon: PencilRuler,
  },
  taf: { id: 'taf', label: 'TAF', long: 'Calculadora TAF', desc: 'Pontuação do teste de aptidão física', icon: Dumbbell },
  sugestoes: {
    id: 'sugestoes',
    label: 'Sugestões',
    long: 'Sugestões',
    desc: 'Envie ideias e correções',
    icon: MessageSquareText,
  },
  termos: { id: 'termos', label: 'Termos', long: 'Termos de uso', desc: 'Termos e privacidade', icon: ScrollText },
};

/** Itens fixos da barra inferior (o 7º botão é "Mais"). A Minha escala é o produto principal. */
export const BOTTOM: RouteId[] = ['inicio', 'release', 'escala', 'taf', 'croqui', 'veiculos'];
/** Rota em destaque na barra inferior (ícone sempre vermelho). */
export const DESTAQUE: RouteId = 'inicio';
/** Itens do menu "Mais". */
export const MORE: RouteId[] = ['sugestoes', 'termos'];
/** Ordem da barra lateral (desktop). */
export const SIDE_MAIN: RouteId[] = ['inicio', 'release', 'escala', 'taf', 'croqui', 'veiculos'];
export const SIDE_EXTRA: RouteId[] = ['sugestoes', 'termos'];

/**
 * Para que lado a tela desliza ao trocar de item na barra inferior, como num carrossel: o item tocado
 * à direita entra pela direita, o da esquerda entra pela esquerda. Os itens do "Mais" ficam à direita
 * de todos os da barra. Mesmo item ou tela fora da barra: sem transição.
 */
export function direcaoNav(de: RouteId | 'notfound', para: RouteId): 'direita' | 'esquerda' | null {
  const ordem: RouteId[] = [...BOTTOM, ...MORE];
  const i = de === 'notfound' ? -1 : ordem.indexOf(de);
  const j = ordem.indexOf(para);
  if (i < 0 || j < 0 || i === j) return null;
  return j > i ? 'direita' : 'esquerda';
}

/**
 * Telas que passam rapidamente no caminho até o item tocado (como no carrossel, que rola por todos
 * os slides do meio), na ordem em que aparecem. Item vizinho: nenhuma.
 */
export function telasNoCaminho(de: RouteId | 'notfound', para: RouteId): RouteId[] {
  const ordem: RouteId[] = [...BOTTOM, ...MORE];
  const i = de === 'notfound' ? -1 : ordem.indexOf(de);
  const j = ordem.indexOf(para);
  if (i < 0 || j < 0) return [];
  return i < j ? ordem.slice(i + 1, j) : ordem.slice(j + 1, i).reverse();
}

export const APP_VERSION = '5.2.4';
