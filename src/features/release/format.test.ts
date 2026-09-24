import { describe, expect, it } from 'vitest';
import modelo from './Formato.txt?raw';
import {
  acrescentarTrecho,
  camposPendentes,
  formatDetido,
  formatEndereco,
  formatRelease,
  type ReleaseData,
} from './format';

/** Modelo enviado pelo usuário (Formato.txt), com quebras de linha normalizadas. */
const MODELO = modelo.replace(/\r\n?/g, '\n');
const LINHAS = MODELO.split('\n');
const HISTORICO = LINHAS[16];

function exemplo(over: Partial<ReleaseData> = {}): ReleaseData {
  return {
    icone: '🦅',
    unidade: '32º BPM - Força Tática',
    fato: 'Mandado de prisão',
    data: '2026-09-23',
    hora: '16:05',
    logradouro: 'Rua Itabuna',
    numero: '175',
    bairro: 'Centenário',
    cidade: 'Sapiranga',
    apreensoes: [],
    detidos: [{ id: '1', nome: 'Anderson Leandro Bairros', complemento: '', rg: '2104033028' }],
    historico: HISTORICO,
    ba: '9297/2026',
    dp: '7523/2026/100929',
    ...over,
  };
}

const linhas = (d: ReleaseData) => formatRelease(d).split('\n');

describe('formatRelease', () => {
  it('reproduz o Formato.txt caractere por caractere', () => {
    // A única diferença aceita é o espaço acidental digitado depois do fato no arquivo.
    const esperado = MODELO.replace('*FATO:* MANDADO DE PRISÃO \n', '*FATO:* MANDADO DE PRISÃO\n');
    expect(formatRelease(exemplo())).toBe(esperado);
  });

  it('mantém as linhas em branco e os rótulos em negrito nas mesmas posições', () => {
    const l = linhas(exemplo());
    expect(l).toHaveLength(21);
    expect(l[0]).toBe('🦅*32º BPM - FORÇA TÁTICA*🦅');
    expect([l[1], l[6], l[7], l[9], l[10], l[13], l[15], l[17], l[18]]).toEqual(Array(9).fill(''));
    expect(l[8]).toBe('*APREENSÃO:* ');
    expect(l[11]).toBe('*INDIVÍDUOS DETIDOS:* ');
    expect(l[14]).toBe('*HISTÓRICO:*');
  });

  it('permite trocar o ícone do título', () => {
    expect(linhas(exemplo({ icone: '🚔' }))[0]).toBe('🚔*32º BPM - FORÇA TÁTICA*🚔');
    expect(linhas(exemplo({ icone: '⚡' }))[0]).toBe('⚡*32º BPM - FORÇA TÁTICA*⚡');
  });

  it('lista as apreensões abaixo do rótulo, uma por linha', () => {
    const txt = formatRelease(exemplo({ apreensoes: ['01 revólver calibre .38', ' 05 munições ', '', '01 celular\n R$ 50,00'] }));
    expect(txt).toContain(
      '*APREENSÃO:* \n01 revólver calibre .38\n05 munições\n01 celular\nR$ 50,00\n\n*INDIVÍDUOS DETIDOS:* \n',
    );
  });

  it('lista vários detidos, um por linha, e ignora os vazios', () => {
    const txt = formatRelease(
      exemplo({
        detidos: [
          { id: '1', nome: 'João da Silva', complemento: '35 anos', rg: '111' },
          { id: '2', nome: '', complemento: '', rg: '' },
          { id: '3', nome: 'Pedro Machado', complemento: '', rg: '222' },
        ],
      }),
    );
    expect(txt).toContain(
      '*INDIVÍDUOS DETIDOS:* \nJoão da Silva - 35 anos, RG N° 111\nPedro Machado - , RG N° 222\n\n*HISTÓRICO:*',
    );
  });

  it('deixa a linha em branco quando não há detidos (estrutura igual ao modelo)', () => {
    const l = linhas(exemplo({ detidos: [] }));
    expect(l).toHaveLength(21);
    expect(l[12]).toBe('');
  });

  it('mantém BA e DP no final mesmo quando ainda não foram preenchidos', () => {
    const l = linhas(exemplo({ ba: '', dp: ' ' }));
    expect(l.slice(-2)).toEqual(['*BA:* ', '*DP:* ']);
  });

  it('preserva o texto e as quebras internas do histórico, sem sobras nas pontas', () => {
    const txt = formatRelease(exemplo({ historico: '\n  Linha 1   \n\nLinha 2  \n\n' }));
    expect(txt).toContain('*HISTÓRICO:*\n\nLinha 1\n\nLinha 2\n\n\n*BA:*');
  });
});

describe('formatEndereco', () => {
  it('monta o endereço completo em maiúsculas', () => {
    expect(formatEndereco({ logradouro: 'rua itabuna', numero: '175', bairro: 'centenário', cidade: 'sapiranga' })).toBe(
      'RUA ITABUNA, N° 175 - CENTENÁRIO, SAPIRANGA',
    );
  });
  it('lida com partes ausentes, S/N, km e "nº" digitado', () => {
    expect(formatEndereco({ logradouro: 'Av. Brasil', numero: '', bairro: '', cidade: 'Canoas' })).toBe('AV. BRASIL, CANOAS');
    expect(formatEndereco({ logradouro: 'Rua A', numero: 'sn', bairro: 'Centro', cidade: '' })).toBe('RUA A, S/N - CENTRO');
    expect(formatEndereco({ logradouro: 'BR-116', numero: 'km 230', bairro: '', cidade: 'Novo Hamburgo' })).toBe(
      'BR-116, KM 230, NOVO HAMBURGO',
    );
    expect(formatEndereco({ logradouro: 'Rua B', numero: 'nº 12', bairro: '', cidade: '' })).toBe('RUA B, N° 12');
  });
});

describe('formatDetido', () => {
  it('segue "nome - complemento, RG N° número"', () => {
    expect(formatDetido({ nome: 'Anderson Leandro Bairros', complemento: '', rg: '2104033028' })).toBe(
      'Anderson Leandro Bairros - , RG N° 2104033028',
    );
    expect(formatDetido({ nome: ' Fulano  de Tal ', complemento: '35 anos', rg: '123' })).toBe('Fulano de Tal - 35 anos, RG N° 123');
  });
  it('normaliza RG já digitado com prefixo', () => {
    expect(formatDetido({ nome: 'Fulano', complemento: '', rg: 'RG nº 123' })).toBe('Fulano - , RG N° 123');
    expect(formatDetido({ nome: 'Fulano', complemento: '', rg: 'rg: 123' })).toBe('Fulano - , RG N° 123');
  });
});

describe('auxiliares', () => {
  it('aponta campos essenciais vazios', () => {
    expect(camposPendentes(exemplo())).toEqual([]);
    expect(camposPendentes(exemplo({ fato: '', cidade: ' ', historico: '' }))).toEqual(['Fato', 'Cidade', 'Histórico']);
  });
  it('acrescenta trechos prontos ao histórico', () => {
    expect(acrescentarTrecho('', 'Frase.')).toBe('Frase.');
    expect(acrescentarTrecho('Texto.  ', 'Frase.')).toBe('Texto. Frase.');
  });
});
