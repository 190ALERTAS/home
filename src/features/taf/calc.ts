/** Cálculo do Teste de Aptidão Física (TAF) — Nota de Instrução nº 3.3/EMBM/2023, Anexo “E”. */

export type Sexo = 'M' | 'F';
export type Faixa = 1 | 2 | 3 | 4 | 5;
export type Exercicio = 'abdominal' | 'barra' | 'apoio' | 'corrida';
export type Par = [number, number];
export type TabelaTaf = Record<Sexo, Record<number, Partial<Record<Exercicio, Par[]>>>>;

export const FAIXAS: { id: Faixa; nome: string; curto: string }[] = [
  { id: 1, nome: 'Até 27 anos', curto: '≤ 27' },
  { id: 2, nome: '28 a 35 anos', curto: '28–35' },
  { id: 3, nome: '36 a 44 anos', curto: '36–44' },
  { id: 4, nome: '45 a 50 anos', curto: '45–50' },
  { id: 5, nome: '51 anos ou mais', curto: '51+' },
];

export const MAXIMO: Record<Exercicio, number> = { abdominal: 75, barra: 75, apoio: 75, corrida: 150 };

export function faixaPorIdade(idade: number): Faixa {
  if (idade <= 27) return 1;
  if (idade <= 35) return 2;
  if (idade <= 44) return 3;
  if (idade <= 50) return 4;
  return 5;
}

export interface InfoExercicio {
  nome: string;
  desc: string;
  unidade: string;
  passo: number;
}

export function infoExercicio(ex: Exercicio, sexo: Sexo): InfoExercicio {
  switch (ex) {
    case 'abdominal':
      return { nome: 'Abdominal', desc: 'Repetições em 60 segundos', unidade: 'rep.', passo: 1 };
    case 'barra':
      return sexo === 'F'
        ? { nome: 'Barra', desc: 'Suspensão na barra (segundos)', unidade: 's', passo: 1 }
        : { nome: 'Barra', desc: 'Flexões na barra fixa', unidade: 'rep.', passo: 1 };
    case 'apoio':
      return { nome: 'Apoio', desc: 'Flexões de braço no solo', unidade: 'rep.', passo: 1 };
    case 'corrida':
      return { nome: 'Corrida', desc: 'Distância em 12 minutos', unidade: 'm', passo: 50 };
  }
}

export function exercicios(tabela: TabelaTaf, sexo: Sexo, faixa: Faixa): Exercicio[] {
  return (['abdominal', 'barra', 'apoio', 'corrida'] as Exercicio[]).filter((e) => tabela[sexo][faixa]?.[e]);
}

export interface Pontuacao {
  pontos: number;
  maximo: number;
  /** Próximo índice que aumenta a pontuação. */
  proximo?: { valor: number; pontos: number };
  /** Índice mínimo para pontuar. */
  minimo: number;
}

export function pontuar(pares: Par[], valor: number, maximo: number): Pontuacao {
  let pontos = 0;
  let proximo: Pontuacao['proximo'];
  for (const [indice, p] of pares) {
    if (valor >= indice) pontos = p;
    else if (p > pontos) {
      proximo = { valor: indice, pontos: p };
      break;
    }
  }
  return { pontos, maximo, proximo, minimo: pares[0]?.[0] ?? 0 };
}

export type Conceito = 'EXCELENTE' | 'MUITO BOM' | 'BOM' | 'REGULAR' | 'INSUFICIENTE';

export function conceito(total: number): Conceito {
  if (total >= 300) return 'EXCELENTE';
  if (total >= 255) return 'MUITO BOM';
  if (total >= 211) return 'BOM';
  if (total >= 151) return 'REGULAR';
  return 'INSUFICIENTE';
}

export const FAIXAS_CONCEITO: { conceito: Conceito; de: number; ate: number }[] = [
  { conceito: 'EXCELENTE', de: 300, ate: 300 },
  { conceito: 'MUITO BOM', de: 255, ate: 299 },
  { conceito: 'BOM', de: 211, ate: 254 },
  { conceito: 'REGULAR', de: 151, ate: 210 },
  { conceito: 'INSUFICIENTE', de: 0, ate: 150 },
];
