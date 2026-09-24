import {
  CalendarDays,
  Dumbbell,
  FileText,
  House,
  MessageSquareText,
  PencilRuler,
  ScrollText,
  Siren,
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
    long: 'Alerta de Veículo',
    desc: 'Furto e roubo de veículos em segundos',
    icon: Siren,
  },
  escala: {
    id: 'escala',
    label: 'Escala',
    long: 'Minha Escala',
    desc: 'Turnos, horas e extras do mês',
    icon: CalendarDays,
  },
  croqui: {
    id: 'croqui',
    label: 'Croqui',
    long: 'Croqui Digital',
    desc: 'Croqui de acidente sobre mapa ou em branco',
    icon: PencilRuler,
  },
  taf: { id: 'taf', label: 'TAF', long: 'Calculadora TAF', desc: 'Pontuação do teste físico', icon: Dumbbell },
  sugestoes: {
    id: 'sugestoes',
    label: 'Sugestões',
    long: 'Sugestões',
    desc: 'Envie ideias e correções',
    icon: MessageSquareText,
  },
  termos: { id: 'termos', label: 'Termos', long: 'Termos de Uso', desc: 'Termos e privacidade', icon: ScrollText },
};

/** Itens fixos da barra inferior (o 5º botão é "Mais"). */
export const BOTTOM: RouteId[] = ['inicio', 'release', 'veiculos', 'escala'];
/** Itens do menu "Mais". */
export const MORE: RouteId[] = ['croqui', 'taf', 'sugestoes', 'termos'];
/** Ordem da barra lateral (desktop). */
export const SIDE_MAIN: RouteId[] = ['inicio', 'release', 'veiculos', 'escala', 'croqui', 'taf'];
export const SIDE_EXTRA: RouteId[] = ['sugestoes', 'termos'];

export const APP_VERSION = '5.0.0';
