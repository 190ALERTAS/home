import { describe, expect, it } from 'vitest';
import { aparenciaPlaca, camposPendentesAlerta, formatAlerta, tipoPlaca, type AlertaData } from './format';

const base: AlertaData = {
  fato: 'ROUBO DE VEÍCULO',
  placa: 'iyx 1d23',
  modelo: 'vw gol',
  cor: 'BRANCA',
  cidade: 'Sapiranga',
  data: '2026-09-23',
  hora: '16:05',
  endereco: 'Rua Itabuna, 175, Centenário',
  historico: 'Dois indivíduos armados\nfugiram sentido centro.',
};

describe('formatAlerta', () => {
  it('mantém o formato da versão anterior, em maiúsculas', () => {
    expect(formatAlerta(base)).toBe(
      [
        '🚨 *ALERTA DE ROUBO DE VEÍCULO* 🚨',
        '',
        '*CIDADE: SAPIRANGA*',
        '*PLACA:* IYX1D23',
        '*MODELO:* VW GOL',
        '*COR:* BRANCA',
        '*DATA:* 23/09/2026 *HORA:* 16:05',
        '*ENDEREÇO:* RUA ITABUNA, 175, CENTENÁRIO',
        '',
        '*HISTÓRICO:*',
        'DOIS INDIVÍDUOS ARMADOS',
        'FUGIRAM SENTIDO CENTRO.',
      ].join('\n'),
    );
  });

  it('não quebra com campos vazios', () => {
    const txt = formatAlerta({ ...base, placa: '', historico: '' });
    expect(txt).toContain('*PLACA:*\n');
    expect(txt.endsWith('*HISTÓRICO:*')).toBe(true);
  });
});

describe('tipoPlaca', () => {
  it('reconhece Mercosul e o padrão antigo', () => {
    expect(tipoPlaca('ABC1D23')).toBe('mercosul');
    expect(tipoPlaca('abc 1d23')).toBe('mercosul');
    expect(tipoPlaca('ABC-1234')).toBe('antiga');
    expect(tipoPlaca('ABC1234')).toBe('antiga');
    expect(tipoPlaca('final 23')).toBeNull();
  });
});

describe('aparenciaPlaca', () => {
  it('assume Mercosul enquanto não dá para distinguir', () => {
    expect(aparenciaPlaca('')).toBe('mercosul');
    expect(aparenciaPlaca('AB')).toBe('mercosul');
    expect(aparenciaPlaca('ABC1')).toBe('mercosul');
    expect(aparenciaPlaca('final 23')).toBe('mercosul');
  });

  it('vira placa cinza assim que o 5º caractere é número', () => {
    expect(aparenciaPlaca('ABC12')).toBe('antiga');
    expect(aparenciaPlaca('abc-1234')).toBe('antiga');
    expect(aparenciaPlaca('ABC 1234')).toBe('antiga');
  });

  it('continua Mercosul quando o 5º caractere é letra', () => {
    expect(aparenciaPlaca('ABC1D')).toBe('mercosul');
    expect(aparenciaPlaca('iyx 1d23')).toBe('mercosul');
  });
});

describe('camposPendentesAlerta', () => {
  it('exige fato, placa ou modelo, cidade e data/hora', () => {
    expect(camposPendentesAlerta(base)).toEqual([]);
    expect(camposPendentesAlerta({ ...base, placa: '', modelo: 'VW GOL' })).toEqual([]);
    expect(camposPendentesAlerta({ ...base, fato: '', placa: '', modelo: '', cidade: '', hora: '' })).toEqual([
      'Fato',
      'Placa ou modelo',
      'Cidade',
      'Data e hora',
    ]);
  });
});
