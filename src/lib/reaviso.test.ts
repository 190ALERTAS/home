import { describe, expect, it } from 'vitest';
import { deveReavisar, INTERVALO_REAVISO_MS } from './reaviso';

describe('reaviso de nova versão ao voltar para o app', () => {
  it('nunca avisou: avisa', () => {
    expect(deveReavisar(1_000, null)).toBe(true);
  });

  it('avisou há 9 minutos: ainda não', () => {
    expect(deveReavisar(9 * 60_000, 0)).toBe(false);
  });

  it('avisou há 10 minutos: avisa de novo', () => {
    expect(INTERVALO_REAVISO_MS).toBe(10 * 60_000);
    expect(deveReavisar(10 * 60_000, 0)).toBe(true);
  });
});
