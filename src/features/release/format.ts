import { formatDateBR } from '../../lib/date';

/** Ícones disponíveis para o título do release. */
export const ICONES = ['🚔', '🦅', '⚡'] as const;
export type ReleaseIcone = (typeof ICONES)[number];

export interface Detido {
  id: string;
  nome: string;
  /** Idade, alcunha ou outra qualificação curta (opcional). */
  complemento: string;
  rg: string;
}

export interface ReleaseData {
  icone: ReleaseIcone;
  unidade: string;
  fato: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  houveApreensao: boolean;
  apreensoes: string[];
  detidos: Detido[];
  historico: string;
  ba: string;
  dp: string;
  /** Destaca os rótulos em *negrito* no WhatsApp. */
  negrito: boolean;
}

const up = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
const clean = (s: string) => s.trim().replace(/[ \t]+/g, ' ');

/** "RUA ITABUNA, N° 175 - CENTENÁRIO, SAPIRANGA" */
export function formatEndereco(d: Pick<ReleaseData, 'logradouro' | 'numero' | 'bairro' | 'cidade'>): string {
  const logradouro = up(d.logradouro);
  const numeroBruto = up(d.numero).replace(/^N\s*[º°O.]\s*(?=\d)/, '');
  const bairro = up(d.bairro);
  const cidade = up(d.cidade);

  let s = logradouro;
  if (numeroBruto) {
    let numero: string;
    if (/^(S\/?N|SN|S\/N°|S\/Nº)$/.test(numeroBruto)) numero = 'S/N';
    else if (/^KM\b/.test(numeroBruto)) numero = numeroBruto;
    else numero = `N° ${numeroBruto}`;
    s += (s ? ', ' : '') + numero;
  }
  if (bairro) s += (s ? ' - ' : '') + bairro;
  if (cidade) s += (s ? ', ' : '') + cidade;
  return s;
}

/** "Anderson Leandro Bairros - 35 anos, RG N° 2104033028" */
export function formatDetido(d: Pick<Detido, 'nome' | 'complemento' | 'rg'>): string {
  const nome = clean(d.nome);
  const complemento = clean(d.complemento);
  const rg = clean(d.rg).replace(/^RG\s*(N\s*[º°.]?)?\s*:?\s*/i, '');
  let s = nome;
  if (complemento) s += (s ? ' - ' : '') + complemento;
  if (rg) s += (s ? ', ' : '') + `RG N° ${rg}`;
  return s;
}

export function detidosValidos(d: ReleaseData): Detido[] {
  return d.detidos.filter((x) => x.nome.trim() || x.rg.trim() || x.complemento.trim());
}

export function apreensoesValidas(d: ReleaseData): string[] {
  return d.houveApreensao ? d.apreensoes.map(clean).filter(Boolean) : [];
}

/** Monta o texto final do release no padrão da Brigada Militar. */
export function formatRelease(d: ReleaseData): string {
  const b = (label: string) => (d.negrito ? `*${label}*` : label);
  const lines: string[] = [];

  const titulo = `${d.icone}${up(d.unidade)}${d.icone}`;
  lines.push(d.negrito ? `*${titulo}*` : titulo);
  lines.push(`${b('FATO:')} ${up(d.fato)}`);
  lines.push(`${b('DATA:')} ${d.data ? formatDateBR(d.data) : ''}`);
  lines.push(`${b('HORA:')} ${d.hora}`);
  lines.push(`${b('ENDEREÇO:')} ${formatEndereco(d)}`);

  const itens = apreensoesValidas(d);
  if (itens.length === 0) lines.push(`${b('APREENSÃO:')} Sem Apreensões`);
  else if (itens.length === 1) lines.push(`${b('APREENSÃO:')} ${itens[0]}`);
  else lines.push(b('APREENSÃO:'), ...itens);

  const detidos = detidosValidos(d).map(formatDetido);
  if (detidos.length === 0) lines.push(`${b('INDIVÍDUOS DETIDOS:')} Nenhum`);
  else lines.push(b('INDIVÍDUOS DETIDOS:'), ...detidos);

  lines.push(b('HISTÓRICO:'));
  const historico = d.historico
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();
  if (historico) lines.push(historico);

  if (d.ba.trim()) lines.push(`${b('BA:')} ${clean(d.ba)}`);
  if (d.dp.trim()) lines.push(`${b('DP:')} ${clean(d.dp)}`);

  return lines.map((l) => l.replace(/[ \t]+$/, '')).join('\n');
}

/** Campos essenciais ainda vazios (para avisar antes de enviar). */
export function camposPendentes(d: ReleaseData): string[] {
  const faltando: string[] = [];
  if (!d.unidade.trim()) faltando.push('Unidade (título)');
  if (!d.fato.trim()) faltando.push('Fato');
  if (!d.data) faltando.push('Data');
  if (!d.hora) faltando.push('Hora');
  if (!d.logradouro.trim() && !d.bairro.trim()) faltando.push('Endereço');
  if (!d.cidade.trim()) faltando.push('Cidade');
  if (!d.historico.trim()) faltando.push('Histórico');
  return faltando;
}

export const FATOS_SUGERIDOS = [
  'MANDADO DE PRISÃO',
  'TRÁFICO DE DROGAS',
  'PORTE ILEGAL DE ARMA DE FOGO',
  'POSSE ILEGAL DE ARMA DE FOGO',
  'DESCUMPRIMENTO DE MEDIDA PROTETIVA',
  'VIOLÊNCIA DOMÉSTICA',
  'RECAPTURA DE FORAGIDO',
  'ROUBO A PEDESTRE',
  'ROUBO A ESTABELECIMENTO COMERCIAL',
  'ROUBO DE VEÍCULO',
  'FURTO DE VEÍCULO',
  'FURTO',
  'RECEPTAÇÃO',
  'ADULTERAÇÃO DE SINAL IDENTIFICADOR DE VEÍCULO',
  'EMBRIAGUEZ AO VOLANTE',
  'LESÃO CORPORAL',
  'AMEAÇA',
  'RESISTÊNCIA E DESACATO',
  'SEQUESTRO',
  'ESTUPRO',
  'TENTATIVA DE HOMICÍDIO',
  'HOMICÍDIO',
  'HOMICÍDIO POR INTERVENÇÃO POLICIAL',
  'APREENSÃO DE ARMA DE FOGO',
  'APREENSÃO DE DROGAS',
] as const;

export const FATOS_RAPIDOS = [
  'MANDADO DE PRISÃO',
  'TRÁFICO DE DROGAS',
  'PORTE ILEGAL DE ARMA DE FOGO',
  'DESCUMPRIMENTO DE MEDIDA PROTETIVA',
  'RECEPTAÇÃO',
  'ROUBO A PEDESTRE',
] as const;

/** Frases prontas para o histórico. `dp` preenche o número da ocorrência. */
export function trechosHistorico(dp: string): { rotulo: string; texto: string }[] {
  const numero = dp.trim() || '___';
  return [
    {
      rotulo: 'Sem algemas',
      texto: 'Não foi necessário o uso de algemas em razão da cooperação do mesmo.',
    },
    {
      rotulo: 'Uso de algemas (SV 11)',
      texto:
        'Foi necessário o uso de algemas para garantir a integridade física da guarnição e do conduzido, conforme a Súmula Vinculante nº 11 do STF.',
    },
    {
      rotulo: 'Direitos informados',
      texto: 'O conduzido foi informado de seus direitos constitucionais.',
    },
    {
      rotulo: 'Encaminhado à DP',
      texto: 'Diante disso, o conduzido foi encaminhado à Delegacia de Polícia para registro.',
    },
    {
      rotulo: 'Nº da ocorrência',
      texto: `Conforme ocorrência registrada sob nº ${numero}.`,
    },
  ];
}

export function acrescentarTrecho(historico: string, trecho: string): string {
  const base = historico.replace(/\s+$/, '');
  if (!base) return trecho;
  return `${base} ${trecho}`;
}
