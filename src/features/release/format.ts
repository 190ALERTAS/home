import { formatDateBR } from '../../lib/date';

/** Ícones disponíveis para o título do release. */
export const ICONES = ['🚔', '🦅', '⚡'] as const;
export type ReleaseIcone = (typeof ICONES)[number];

export interface Detido {
  id: string;
  nome: string;
  /** Texto entre o nome e o RG (idade, alcunha…). Pode ficar vazio, como no padrão. */
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
  /** Itens apreendidos, um por linha. Vazio: a linha abaixo de APREENSÃO fica em branco. */
  apreensoes: string[];
  detidos: Detido[];
  historico: string;
  ba: string;
  dp: string;
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

/**
 * "Anderson Leandro Bairros - , RG N° 2104033028" — o separador " - " e o ", RG N°"
 * ficam sempre, exatamente como no modelo, mesmo com o complemento vazio.
 */
export function formatDetido(d: Pick<Detido, 'nome' | 'complemento' | 'rg'>): string {
  const nome = clean(d.nome);
  const complemento = clean(d.complemento);
  const rg = clean(d.rg).replace(/^RG\s*(N\s*[º°.]?)?\s*:?\s*/i, '');
  return `${nome} - ${complemento}, RG N° ${rg}`;
}

export function detidosValidos(d: Pick<ReleaseData, 'detidos'>): Detido[] {
  return d.detidos.filter((x) => x.nome.trim() || x.rg.trim() || x.complemento.trim());
}

export function apreensoesValidas(d: Pick<ReleaseData, 'apreensoes'>): string[] {
  return d.apreensoes
    .flatMap((item) => item.split(/\r?\n/))
    .map(clean)
    .filter(Boolean);
}

function normalizarHistorico(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
    .replace(/^[ \t]+/, '');
}

/**
 * Monta o release exatamente no modelo do batalhão (ver `Formato.txt`):
 * rótulos em *negrito*, linhas em branco nas mesmas posições e todos os campos
 * sempre presentes — o que não foi preenchido sai em branco.
 */
export function formatRelease(d: ReleaseData): string {
  const unidade = up(d.unidade);
  const apreensoes = apreensoesValidas(d);
  const detidos = detidosValidos(d).map(formatDetido);

  return [
    `${d.icone}${unidade ? `*${unidade}*` : ''}${d.icone}`,
    '',
    `*FATO:* ${up(d.fato)}`,
    `*DATA:* ${d.data ? formatDateBR(d.data) : ''}`,
    `*HORA:* ${d.hora}`,
    `*ENDEREÇO:* ${formatEndereco(d)}`,
    '',
    '',
    '*APREENSÃO:* ',
    ...(apreensoes.length ? apreensoes : ['']),
    '',
    '*INDIVÍDUOS DETIDOS:* ',
    ...(detidos.length ? detidos : ['']),
    '',
    '*HISTÓRICO:*',
    '',
    normalizarHistorico(d.historico),
    '',
    '',
    `*BA:* ${clean(d.ba)}`,
    `*DP:* ${clean(d.dp)}`,
  ].join('\n');
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

/** Fatos mais comuns, agrupados para o seletor (o usuário também pode digitar outro). */
export const FATOS_GRUPOS: { titulo: string; itens: readonly string[] }[] = [
  {
    titulo: 'Mandados e capturas',
    itens: ['MANDADO DE PRISÃO', 'RECAPTURA DE FORAGIDO', 'MANDADO DE BUSCA E APREENSÃO', 'APREENSÃO DE ADOLESCENTE'],
  },
  {
    titulo: 'Drogas',
    itens: ['TRÁFICO DE DROGAS', 'POSSE DE DROGAS PARA CONSUMO', 'ASSOCIAÇÃO PARA O TRÁFICO', 'APREENSÃO DE DROGAS'],
  },
  {
    titulo: 'Armas',
    itens: [
      'PORTE ILEGAL DE ARMA DE FOGO',
      'POSSE ILEGAL DE ARMA DE FOGO',
      'PORTE ILEGAL DE ARMA DE FOGO DE USO RESTRITO',
      'DISPARO DE ARMA DE FOGO',
      'APREENSÃO DE ARMA DE FOGO',
    ],
  },
  {
    titulo: 'Patrimônio',
    itens: [
      'ROUBO A PEDESTRE',
      'ROUBO A ESTABELECIMENTO COMERCIAL',
      'ROUBO A RESIDÊNCIA',
      'ROUBO DE VEÍCULO',
      'ROUBO DE CARGA',
      'LATROCÍNIO',
      'FURTO',
      'FURTO QUALIFICADO',
      'FURTO DE VEÍCULO',
      'FURTO EM RESIDÊNCIA',
      'FURTO EM ESTABELECIMENTO COMERCIAL',
      'RECEPTAÇÃO',
      'ADULTERAÇÃO DE SINAL IDENTIFICADOR DE VEÍCULO',
      'ESTELIONATO',
      'EXTORSÃO',
      'DANO',
    ],
  },
  {
    titulo: 'Contra a pessoa',
    itens: [
      'HOMICÍDIO',
      'TENTATIVA DE HOMICÍDIO',
      'FEMINICÍDIO',
      'TENTATIVA DE FEMINICÍDIO',
      'LESÃO CORPORAL',
      'AMEAÇA',
      'SEQUESTRO E CÁRCERE PRIVADO',
      'ESTUPRO',
      'ESTUPRO DE VULNERÁVEL',
      'MORTE DECORRENTE DE INTERVENÇÃO POLICIAL',
    ],
  },
  {
    titulo: 'Violência doméstica',
    itens: ['VIOLÊNCIA DOMÉSTICA', 'DESCUMPRIMENTO DE MEDIDA PROTETIVA'],
  },
  {
    titulo: 'Trânsito',
    itens: [
      'EMBRIAGUEZ AO VOLANTE',
      'DIREÇÃO SEM HABILITAÇÃO',
      'ACIDENTE DE TRÂNSITO COM VÍTIMA',
      'FUGA DO LOCAL DO ACIDENTE',
    ],
  },
  {
    titulo: 'Outros',
    itens: [
      'RESISTÊNCIA',
      'DESACATO',
      'DESOBEDIÊNCIA',
      'RESISTÊNCIA E DESACATO',
      'CORRUPÇÃO DE MENORES',
      'ATO INFRACIONAL',
      'CONTRABANDO E DESCAMINHO',
      'CRIME AMBIENTAL',
      'MAUS-TRATOS A ANIMAIS',
      'PERTURBAÇÃO DO SOSSEGO',
    ],
  },
];

/** Atalhos de um toque enquanto o usuário ainda não tem fatos recentes. */
export const FATOS_PADRAO = ['MANDADO DE PRISÃO', 'TRÁFICO DE DROGAS', 'PORTE ILEGAL DE ARMA DE FOGO'] as const;

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
