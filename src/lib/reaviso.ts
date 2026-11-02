/** Intervalo mínimo entre dois avisos de "Nova versão disponível" ao voltar para o app. */
export const INTERVALO_REAVISO_MS = 10 * 60 * 1000;

/** Mostrar o aviso de novo? Sim se nunca avisou ou se já passou o intervalo. */
export function deveReavisar(agora: number, ultimoAviso: number | null): boolean {
  return ultimoAviso === null || agora - ultimoAviso >= INTERVALO_REAVISO_MS;
}
