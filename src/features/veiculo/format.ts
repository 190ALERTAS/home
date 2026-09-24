import { formatDateBR } from '../../lib/date';

export interface AlertaData {
  fato: string;
  placa: string;
  modelo: string;
  cor: string;
  cidade: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  endereco: string;
  historico: string;
}

export const FATOS_ALERTA = [
  { value: 'FURTO DE VEÍCULO', label: 'Furto' },
  { value: 'ROUBO DE VEÍCULO', label: 'Roubo' },
  { value: 'ROUBO DE VEÍCULO COM SEQUESTRO', label: 'Roubo c/ sequestro' },
] as const;

export const CORES: { nome: string; hex: string }[] = [
  { nome: 'BRANCA', hex: '#f5f5f5' },
  { nome: 'PRETA', hex: '#111111' },
  { nome: 'PRATA', hex: '#c0c4c8' },
  { nome: 'CINZA', hex: '#6f7478' },
  { nome: 'VERMELHA', hex: '#d32f2f' },
  { nome: 'AZUL', hex: '#1e5bd8' },
  { nome: 'VERDE', hex: '#2e7d32' },
  { nome: 'AMARELA', hex: '#f4c20d' },
  { nome: 'BEGE', hex: '#d8c3a0' },
  { nome: 'MARROM', hex: '#6d4c41' },
  { nome: 'GRENÁ', hex: '#7b1f2e' },
  { nome: 'LARANJA', hex: '#f57c00' },
  { nome: 'DOURADA', hex: '#c9a33b' },
  { nome: 'ROSA', hex: '#e91e8c' },
  { nome: 'ROXA', hex: '#6a1b9a' },
  { nome: 'FANTASIA', hex: 'conic-gradient(#e53935, #fbc02d, #43a047, #1e88e5, #8e24aa, #e53935)' },
];

export type TipoPlaca = 'mercosul' | 'antiga' | null;

export function normalizarPlaca(placa: string): string {
  return placa.toLocaleUpperCase('pt-BR').replace(/\s+/g, '');
}

export function tipoPlaca(placa: string): TipoPlaca {
  const p = normalizarPlaca(placa).replace('-', '');
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(p)) return 'mercosul';
  if (/^[A-Z]{3}\d{4}$/.test(p)) return 'antiga';
  return null;
}

/**
 * Mesmo formato da versão anterior (já conhecido nos grupos), todo em maiúsculas:
 *
 * 🚨 *ALERTA DE ROUBO DE VEÍCULO* 🚨
 *
 * *CIDADE: SAPIRANGA*
 * *PLACA:* ABC1D23
 * ...
 */
export function formatAlerta(d: AlertaData): string {
  const t = (s: string) => s.trim();
  const texto = [
    `🚨 *ALERTA DE ${t(d.fato)}* 🚨`,
    '',
    `*CIDADE: ${t(d.cidade)}*`,
    `*PLACA:* ${normalizarPlaca(d.placa)}`,
    `*MODELO:* ${t(d.modelo)}`,
    `*COR:* ${t(d.cor)}`,
    `*DATA:* ${d.data ? formatDateBR(d.data) : ''} *HORA:* ${d.hora}`,
    `*ENDEREÇO:* ${t(d.endereco)}`,
    '',
    '*HISTÓRICO:*',
    t(d.historico.replace(/\r\n?/g, '\n')),
  ].join('\n');
  return texto
    .toLocaleUpperCase('pt-BR')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .trimEnd();
}

export function camposPendentesAlerta(d: AlertaData): string[] {
  const faltando: string[] = [];
  if (!d.fato.trim()) faltando.push('Fato');
  if (!d.placa.trim() && !d.modelo.trim()) faltando.push('Placa ou modelo');
  if (!d.cidade.trim()) faltando.push('Cidade');
  if (!d.data || !d.hora) faltando.push('Data e hora');
  return faltando;
}
