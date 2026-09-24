import { describe, expect, it } from 'vitest';
import {
  acrescentarTrecho,
  camposPendentes,
  formatDetido,
  formatEndereco,
  formatRelease,
  type ReleaseData,
} from './format';

const HISTORICO =
  'A equipe da Força Tática, formada pelo Sd Igor, Sd Miltom e Sd Zenatti realizou a prisão do senhor Anderson, durante abordagem ao mesmo foi constatado que havia em seu desfavor um mandado de prisão cível N° do Mandado: 5000349-11.2024.8.21.0132.01.0009-07, diante disso encaminhou o mesmo a upa e posteriormente a delegacia de policia para registro. Não foi necessário o uso de algemas em razão da cooperação do mesmo. Conforme ocorrência registrada sob nº 7523/2026/100942.';

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
    houveApreensao: false,
    apreensoes: [],
    detidos: [{ id: '1', nome: 'Anderson Leandro Bairros', complemento: '35 anos', rg: '2104033028' }],
    historico: HISTORICO,
    ba: '9297/2026',
    dp: '7523/2026/100929',
    negrito: false,
    ...over,
  };
}

describe('formatRelease', () => {
  it('gera exatamente o padrão solicitado', () => {
    expect(formatRelease(exemplo())).toBe(
      [
        '🦅32º BPM - FORÇA TÁTICA🦅',
        'FATO: MANDADO DE PRISÃO',
        'DATA: 23/09/2026',
        'HORA: 16:05',
        'ENDEREÇO: RUA ITABUNA, N° 175 - CENTENÁRIO, SAPIRANGA',
        'APREENSÃO: Sem Apreensões',
        'INDIVÍDUOS DETIDOS:',
        'Anderson Leandro Bairros - 35 anos, RG N° 2104033028',
        'HISTÓRICO:',
        HISTORICO,
        'BA: 9297/2026',
        'DP: 7523/2026/100929',
      ].join('\n'),
    );
  });

  it('permite trocar o ícone do título', () => {
    expect(formatRelease(exemplo({ icone: '🚔' })).split('\n')[0]).toBe('🚔32º BPM - FORÇA TÁTICA🚔');
    expect(formatRelease(exemplo({ icone: '⚡' })).split('\n')[0]).toBe('⚡32º BPM - FORÇA TÁTICA⚡');
  });

  it('omite o complemento vazio do detido em vez de deixar " - ,"', () => {
    const txt = formatRelease(exemplo({ detidos: [{ id: '1', nome: 'Anderson Leandro Bairros', complemento: '', rg: '2104033028' }] }));
    expect(txt).toContain('\nAnderson Leandro Bairros, RG N° 2104033028\n');
  });

  it('lista vários detidos, um por linha, e ignora linhas vazias', () => {
    const txt = formatRelease(
      exemplo({
        detidos: [
          { id: '1', nome: 'João da Silva', complemento: '', rg: '111' },
          { id: '2', nome: '', complemento: '', rg: '' },
          { id: '3', nome: 'Pedro Machado', complemento: 'vulgo "Magrão"', rg: '' },
        ],
      }),
    );
    expect(txt).toContain('INDIVÍDUOS DETIDOS:\nJoão da Silva, RG N° 111\nPedro Machado - vulgo "Magrão"\nHISTÓRICO:');
  });

  it('informa "Nenhum" quando não há detidos', () => {
    expect(formatRelease(exemplo({ detidos: [] }))).toContain('INDIVÍDUOS DETIDOS: Nenhum\nHISTÓRICO:');
  });

  it('formata apreensões (uma na mesma linha, várias em lista)', () => {
    expect(formatRelease(exemplo({ houveApreensao: true, apreensoes: ['01 revólver calibre .38'] }))).toContain(
      'APREENSÃO: 01 revólver calibre .38\n',
    );
    expect(
      formatRelease(exemplo({ houveApreensao: true, apreensoes: ['01 revólver calibre .38', ' 05 munições ', ''] })),
    ).toContain('APREENSÃO:\n01 revólver calibre .38\n05 munições\nINDIVÍDUOS DETIDOS:');
    // interruptor desligado ignora itens digitados
    expect(formatRelease(exemplo({ houveApreensao: false, apreensoes: ['x'] }))).toContain('APREENSÃO: Sem Apreensões');
  });

  it('omite BA e DP quando vazios', () => {
    const txt = formatRelease(exemplo({ ba: '', dp: ' ' }));
    expect(txt.endsWith(HISTORICO)).toBe(true);
  });

  it('aplica negrito do WhatsApp quando habilitado', () => {
    const txt = formatRelease(exemplo({ negrito: true }));
    expect(txt.split('\n')[0]).toBe('*🦅32º BPM - FORÇA TÁTICA🦅*');
    expect(txt).toContain('*FATO:* MANDADO DE PRISÃO');
    expect(txt).toContain('*DP:* 7523/2026/100929');
  });

  it('preserva quebras de linha do histórico e remove espaços sobrando', () => {
    const txt = formatRelease(exemplo({ historico: '  Linha 1   \n\nLinha 2  \n\n' }));
    expect(txt).toContain('HISTÓRICO:\nLinha 1\n\nLinha 2\nBA:');
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
  it('normaliza RG já digitado com prefixo', () => {
    expect(formatDetido({ nome: 'Fulano', complemento: '', rg: 'RG nº 123' })).toBe('Fulano, RG N° 123');
    expect(formatDetido({ nome: 'Fulano', complemento: '', rg: 'rg: 123' })).toBe('Fulano, RG N° 123');
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
