import { describe, expect, it } from 'vitest';
import modelo from './Formato.txt?raw';
import {
  acrescentarTrecho,
  camposPendentes,
  formatDetido,
  formatEndereco,
  formatRelease,
  normalizarRegistro,
  type ReleaseData,
} from './format';

/** Modelo enviado pelo usuário (Formato.txt), com quebras de linha normalizadas. */
const MODELO = modelo.replace(/\r\n?/g, '\n');
const LINHAS = MODELO.split('\n');
const HISTORICO = LINHAS[17];

function exemplo(over: Partial<ReleaseData> = {}): ReleaseData {
  return {
    icone: '🦅',
    unidade: '32º BPM - Força Tática',
    fato: 'Porte ilegal de arma de fogo',
    data: '2026-09-24',
    hora: '20:23',
    logradouro: 'Rua Nobel',
    numero: '78',
    bairro: 'Canudos',
    cidade: 'Novo Hamburgo',
    apreensoes: ['20un de munições diversas', '1un revolver cal .38'],
    detidos: [
      { id: '1', nome: 'José da Silva', rg: '1234567855' },
      { id: '2', nome: 'Manuel de Oliveira', rg: '9939773781' },
    ],
    historico: HISTORICO,
    ba: '1111/1111/1111',
    dp: '1111/1111/1111',
    ...over,
  };
}

const linhas = (d: ReleaseData) => formatRelease(d).split('\n');

describe('formatRelease', () => {
  it('reproduz o Formato.txt caractere por caractere', () => {
    expect(formatRelease(exemplo())).toBe(MODELO);
  });

  it('mantém as linhas em branco e os rótulos em negrito nas mesmas posições', () => {
    const l = linhas(exemplo());
    expect(l).toHaveLength(22);
    expect(l[0]).toBe('🦅*32º BPM - FORÇA TÁTICA*🦅');
    expect([l[1], l[6], l[7], l[11], l[15], l[18], l[19]]).toEqual(Array(7).fill(''));
    expect(l[8]).toBe('*APREENSÃO:* ');
    expect(l[12]).toBe('*INDIVÍDUOS DETIDOS:* ');
    // O histórico vem logo abaixo do rótulo, sem linha em branco.
    expect(l.slice(16, 18)).toEqual(['*HISTÓRICO:*', HISTORICO]);
  });

  it('permite trocar o ícone do título', () => {
    expect(linhas(exemplo({ icone: '🚔' }))[0]).toBe('🚔*32º BPM - FORÇA TÁTICA*🚔');
    expect(linhas(exemplo({ icone: '⚡' }))[0]).toBe('⚡*32º BPM - FORÇA TÁTICA*⚡');
  });

  it('lista as apreensões com "- ", em maiúsculas, uma por linha', () => {
    const txt = formatRelease(
      exemplo({ apreensoes: ['01 revólver calibre .38', ' 05 munições ', '', '01 celular\n R$ 50,00', '- 1 balança', '• 2 rádios'] }),
    );
    expect(txt).toContain(
      '*APREENSÃO:* \n- 01 REVÓLVER CALIBRE .38\n- 05 MUNIÇÕES\n- 01 CELULAR\n- R$ 50,00\n- 1 BALANÇA\n- 2 RÁDIOS\n\n*INDIVÍDUOS DETIDOS:* \n',
    );
  });

  it('lista os detidos com "- NOME (RG: número)" e ignora os vazios', () => {
    const txt = formatRelease(
      exemplo({
        detidos: [
          { id: '1', nome: 'João da Silva', rg: '111' },
          { id: '2', nome: '', rg: '' },
          { id: '3', nome: 'Pedro Machado', rg: '' },
        ],
      }),
    );
    expect(txt).toContain('*INDIVÍDUOS DETIDOS:* \n- JOÃO DA SILVA (RG: 111)\n- PEDRO MACHADO\n\n*HISTÓRICO:*');
  });

  it('deixa uma linha em branco quando não há apreensões nem detidos (estrutura igual ao modelo)', () => {
    const l = linhas(exemplo({ apreensoes: [], detidos: [] }));
    expect(l).toHaveLength(20);
    expect(l.slice(8, 13)).toEqual(['*APREENSÃO:* ', '', '', '*INDIVÍDUOS DETIDOS:* ', '']);
  });

  it('mantém BA e DP no final mesmo quando ainda não foram preenchidos', () => {
    const l = linhas(exemplo({ ba: '', dp: ' ' }));
    expect(l.slice(-2)).toEqual(['*BA:* ', '*DP:* ']);
  });

  it('preserva o texto e as quebras internas do histórico, sem sobras nas pontas', () => {
    const txt = formatRelease(exemplo({ historico: '\n  Linha 1   \n\nLinha 2  \n\n' }));
    expect(txt).toContain('*HISTÓRICO:*\nLinha 1\n\nLinha 2\n\n\n*BA:*');
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
  it('segue "- NOME (RG: número)"', () => {
    expect(formatDetido({ nome: 'José da Silva', rg: '1234567855' })).toBe('- JOSÉ DA SILVA (RG: 1234567855)');
    expect(formatDetido({ nome: ' Fulano  de Tal ', rg: ' 123 ' })).toBe('- FULANO DE TAL (RG: 123)');
  });
  it('sem RG fica só o nome; sem nome, só o RG', () => {
    expect(formatDetido({ nome: 'Fulano', rg: '' })).toBe('- FULANO');
    expect(formatDetido({ nome: '', rg: '123' })).toBe('- (RG: 123)');
  });
  it('normaliza RG já digitado com prefixo e marcador já digitado no nome', () => {
    expect(formatDetido({ nome: 'Fulano', rg: 'RG nº 123' })).toBe('- FULANO (RG: 123)');
    expect(formatDetido({ nome: 'Fulano', rg: 'rg: 123' })).toBe('- FULANO (RG: 123)');
    expect(formatDetido({ nome: '- Fulano', rg: '1' })).toBe('- FULANO (RG: 1)');
  });
});

describe('normalizarRegistro (BA e DP)', () => {
  it('mantém números já separados por "/"', () => {
    expect(normalizarRegistro('1111/1111/1111')).toBe('1111/1111/1111');
    expect(normalizarRegistro('7523/2026/100929')).toBe('7523/2026/100929');
    expect(normalizarRegistro('')).toBe('');
  });
  it('troca ponto, vírgula, traço e espaço digitados entre números por "/"', () => {
    expect(normalizarRegistro('9297.2026')).toBe('9297/2026');
    expect(normalizarRegistro('7523,2026-100929')).toBe('7523/2026/100929');
    expect(normalizarRegistro('9297 / 2026')).toBe('9297/2026');
    expect(normalizarRegistro('9297//2026')).toBe('9297/2026');
    // enquanto digita: o separador logo depois do número já vira barra
    expect(normalizarRegistro('9297.')).toBe('9297/');
    expect(normalizarRegistro('9297 ')).toBe('9297/');
  });
  it('não mexe em texto que não é separador entre números', () => {
    expect(normalizarRegistro('9297/2026 e 9298/2026')).toBe('9297/2026 e 9298/2026');
    expect(normalizarRegistro('BA 9297/2026')).toBe('BA 9297/2026');
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
